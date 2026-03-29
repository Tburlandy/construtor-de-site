// Plugin Vite para integrar API do Studio
import type { Plugin } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import { ContentSchema, type Content } from './src/content/schema.js';
import { ProjectSchema, type ProjectId } from './src/platform/contracts/index.js';
import { createProjectContentRepository } from './src/platform/repositories/projectContentRepository.js';
import { createProjectMetadataRepository } from './src/platform/repositories/projectMetadataRepository.js';
import { createProjectPublicationRepository } from './src/platform/repositories/projectPublicationRepository.js';
import { createProjectSeoConfigRepository } from './src/platform/repositories/projectSeoConfigRepository.js';
import {
  buildProjectContentRecord,
  parseGlobalSiteContentJson,
  siteContentFromRecord,
} from './src/platform/repositories/projectSiteContentBridge.js';
import {
  buildProjectSeoConfig,
  siteSeoFromProjectSeoConfig,
} from './src/platform/repositories/projectSeoConfigBridge.js';
import {
  ProjectsApiError,
  createProject,
  duplicateProject,
  getProjectById,
  listProjectPublications,
  listProjects,
} from './src/platform/studio/projectsStudioApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseProjectIdOrThrow(projectIdRaw: string): ProjectId {
  try {
    return ProjectSchema.parse({ projectId: projectIdRaw }).projectId;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ProjectsApiError(400, 'projectId inválido', {
        details: error.flatten(),
      });
    }
    throw error;
  }
}

async function readLegacyContent(contentPath: string): Promise<Content> {
  const raw = await fs.readFile(contentPath, 'utf-8');
  return parseGlobalSiteContentJson(JSON.parse(raw));
}

function getProjectMediaDirectory(
  mediaProjectsPath: string,
  projectId: ProjectId,
  mediaKind: 'img' | 'vid',
): string {
  return path.join(mediaProjectsPath, projectId, mediaKind);
}

function getProjectMediaUrl(projectId: ProjectId, mediaKind: 'img' | 'vid', filename: string): string {
  return `/media/projects/${projectId}/${mediaKind}/${filename}`;
}

export function studioPlugin(): Plugin {
  return {
    name: 'studio-server',
    configureServer(server) {
      const contentPath = path.join(__dirname, 'content', 'content.json');
      const mediaImgPath = path.join(__dirname, 'public', 'media', 'img');
      const mediaVidPath = path.join(__dirname, 'public', 'media', 'vid');
      const mediaProjectsPath = path.join(__dirname, 'public', 'media', 'projects');
      const projectsDataRoot = path.join(__dirname, 'data', 'projects');

      const projectMetadataRepository = createProjectMetadataRepository({
        projectsRootDir: projectsDataRoot,
      });
      const projectContentRepository = createProjectContentRepository({
        projectsRootDir: projectsDataRoot,
      });
      const projectPublicationRepository = createProjectPublicationRepository({
        projectsRootDir: projectsDataRoot,
      });
      const projectSeoConfigRepository = createProjectSeoConfigRepository({
        projectsRootDir: projectsDataRoot,
      });

      async function ensureDirectories() {
        await fs.mkdir(mediaImgPath, { recursive: true });
        await fs.mkdir(mediaVidPath, { recursive: true });
        await fs.mkdir(mediaProjectsPath, { recursive: true });
        await fs.mkdir(projectsDataRoot, { recursive: true });
        await fs.mkdir(path.join(__dirname, 'tmp'), { recursive: true });
      }
      void ensureDirectories();

      const storage = multer.diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, path.join(__dirname, 'tmp'));
        },
        filename: (_req, _file, cb) => {
          cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}`);
        },
      });
      const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

      // /api/projects — shell de gestão e fluxo de conteúdo/mídia por projeto
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? '/';
        const pathname = new URL(rawUrl, 'http://studio.dev').pathname;
        if (!pathname.startsWith('/api/projects')) {
          return next();
        }

        const base = '/api/projects';
        const rest = pathname.slice(base.length);
        const segments = rest.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

        const sendJson = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        const INVALID_JSON = Symbol('invalid-json');
        const readBody = async (): Promise<unknown | typeof INVALID_JSON> => {
          let body = '';
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => resolve());
            req.on('error', reject);
          });

          try {
            return body.length > 0 ? JSON.parse(body) : {};
          } catch {
            return INVALID_JSON;
          }
        };

        const runUpload = async (fieldName: 'image' | 'video') => {
          await new Promise<void>((resolve, reject) => {
            upload.single(fieldName)(req as never, res as never, (err: unknown) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          });

          const uploadRequest = req as unknown as {
            file?: {
              path: string;
              originalname: string;
            };
          };
          return uploadRequest.file;
        };

        try {
          if (req.method === 'GET' && segments.length === 0) {
            const items = await listProjects(projectMetadataRepository);
            return sendJson(200, items);
          }

          if (req.method === 'POST' && segments.length === 0) {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }
            const saved = await createProject(projectMetadataRepository, parsed);
            return sendJson(201, saved);
          }

          if (req.method === 'GET' && segments.length === 1) {
            const item = await getProjectById(projectMetadataRepository, segments[0]);
            if (!item) {
              return sendJson(404, { error: 'Projeto não encontrado' });
            }
            return sendJson(200, item);
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'publications') {
            const items = await listProjectPublications(
              projectMetadataRepository,
              projectPublicationRepository,
              segments[0],
            );
            return sendJson(200, items);
          }

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'duplicate') {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }
            const duplicated = await duplicateProject(
              projectMetadataRepository,
              projectContentRepository,
              segments[0],
              parsed,
            );
            return sendJson(201, duplicated);
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'content') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const record = await projectContentRepository.getByProjectId(projectId);
            const baseContent = record ? siteContentFromRecord(record) : await readLegacyContent(contentPath);
            const seoConfig = await projectSeoConfigRepository.getByProjectId(projectId);
            if (!seoConfig) {
              return sendJson(200, baseContent);
            }
            return sendJson(200, {
              ...baseContent,
              seo: siteSeoFromProjectSeoConfig(seoConfig),
            });
          }

          if (req.method === 'PUT' && segments.length === 2 && segments[1] === 'content') {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }
            const projectId = parseProjectIdOrThrow(segments[0]);
            const content = ContentSchema.parse(parsed);
            const record = buildProjectContentRecord({
              projectId,
              content,
            });
            await projectContentRepository.save(record);
            await projectSeoConfigRepository.save(
              buildProjectSeoConfig({
                projectId,
                seo: content.seo,
              }),
            );
            return sendJson(200, content);
          }

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'upload-image') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const projectMediaImgPath = getProjectMediaDirectory(mediaProjectsPath, projectId, 'img');
            await fs.mkdir(projectMediaImgPath, { recursive: true });

            let file:
              | {
                  path: string;
                  originalname: string;
                }
              | undefined;
            try {
              file = await runUpload('image');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erro no upload';
              return sendJson(400, { error: message });
            }

            if (!file) {
              return sendJson(400, { error: 'Nenhuma imagem enviada' });
            }

            try {
              const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
              const outputPath = path.join(projectMediaImgPath, filename);
              await sharp(file.path)
                .webp({ quality: 75 })
                .resize(1920, null, { withoutEnlargement: true })
                .toFile(outputPath);
              await fs.unlink(file.path);
              return sendJson(200, {
                projectId,
                url: getProjectMediaUrl(projectId, 'img', filename),
                filename,
              });
            } catch (error) {
              try {
                await fs.unlink(file.path);
              } catch {
                // noop: melhor esforço na limpeza de arquivo temporário
              }
              console.error('Erro ao processar imagem do projeto:', error);
              return sendJson(500, { error: 'Erro ao processar imagem do projeto' });
            }
          }

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'upload-video') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const projectMediaVidPath = getProjectMediaDirectory(mediaProjectsPath, projectId, 'vid');
            await fs.mkdir(projectMediaVidPath, { recursive: true });

            let file:
              | {
                  path: string;
                  originalname: string;
                }
              | undefined;
            try {
              file = await runUpload('video');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erro no upload';
              return sendJson(400, { error: message });
            }

            if (!file) {
              return sendJson(400, { error: 'Nenhum vídeo enviado' });
            }

            try {
              const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
              const ext = path.extname(file.originalname);
              const savedFilename = `${filename}${ext}`;
              const outputPath = path.join(projectMediaVidPath, savedFilename);
              await fs.copyFile(file.path, outputPath);
              await fs.unlink(file.path);
              const posterFilename = `${filename}-poster.webp`;
              return sendJson(200, {
                projectId,
                url: getProjectMediaUrl(projectId, 'vid', savedFilename),
                filename: savedFilename,
                poster: getProjectMediaUrl(projectId, 'img', posterFilename),
              });
            } catch (error) {
              try {
                await fs.unlink(file.path);
              } catch {
                // noop: melhor esforço na limpeza de arquivo temporário
              }
              console.error('Erro ao processar vídeo do projeto:', error);
              return sendJson(500, { error: 'Erro ao processar vídeo do projeto' });
            }
          }

          return sendJson(405, { error: 'Método não permitido' });
        } catch (error) {
          if (error instanceof ProjectsApiError) {
            return sendJson(error.statusCode, {
              error: error.message,
              ...error.payload,
            });
          }
          if (error instanceof z.ZodError) {
            return sendJson(400, {
              error: 'Payload inválido',
              details: error.flatten(),
            });
          }
          console.error('Erro em /api/projects:', error);
          return sendJson(500, { error: 'Erro ao processar projetos' });
        }
      });

      // GET /api/content
      server.middlewares.use('/api/content', async (req, res, next) => {
        if (req.method !== 'GET') {
          return next();
        }

        try {
          const content = await fs.readFile(contentPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(content);
        } catch (error) {
          console.error('Erro ao ler conteúdo:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Erro ao ler conteúdo' }));
        }
      });

      // PUT /api/content
      server.middlewares.use('/api/content', async (req, res, next) => {
        if (req.method !== 'PUT') {
          return next();
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const content = ContentSchema.parse(JSON.parse(body));
            await fs.writeFile(contentPath, JSON.stringify(content, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('Erro ao salvar conteúdo:', error);
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Erro ao validar conteúdo' }));
          }
        });
      });

      // POST /api/upload-image
      server.middlewares.use('/api/upload-image', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        upload.single('image')(req as never, res as never, async (err: unknown) => {
          if (err) {
            const message = err instanceof Error ? err.message : 'Erro no upload';
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
            return;
          }

          const file = (req as unknown as { file?: { path: string } }).file;
          if (!file) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Nenhuma imagem enviada' }));
            return;
          }

          try {
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
            const outputPath = path.join(mediaImgPath, filename);
            await sharp(file.path)
              .webp({ quality: 75 })
              .resize(1920, null, { withoutEnlargement: true })
              .toFile(outputPath);
            await fs.unlink(file.path);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: `/media/img/${filename}`, filename }));
          } catch (error) {
            console.error('Erro ao processar imagem:', error);
            try {
              await fs.unlink(file.path);
            } catch {
              // noop: melhor esforço na limpeza de arquivo temporário
            }
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Erro ao processar imagem' }));
          }
        });
      });

      // POST /api/upload-video
      server.middlewares.use('/api/upload-video', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        upload.single('video')(req as never, res as never, async (err: unknown) => {
          if (err) {
            const message = err instanceof Error ? err.message : 'Erro no upload';
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
            return;
          }

          const file = (req as unknown as { file?: { path: string; originalname: string } }).file;
          if (!file) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Nenhum vídeo enviado' }));
            return;
          }

          try {
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const ext = path.extname(file.originalname);
            const outputPath = path.join(mediaVidPath, `${filename}${ext}`);
            await fs.copyFile(file.path, outputPath);
            await fs.unlink(file.path);
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                url: `/media/vid/${filename}${ext}`,
                filename: `${filename}${ext}`,
                poster: '',
              }),
            );
          } catch (error) {
            console.error('Erro ao processar vídeo:', error);
            try {
              await fs.unlink(file.path);
            } catch {
              // noop: melhor esforço na limpeza de arquivo temporário
            }
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Erro ao processar vídeo' }));
          }
        });
      });
    },
  };
}
