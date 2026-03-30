// Plugin Vite para integrar API do Studio
import type { Plugin } from 'vite';
import fs from 'fs/promises';
import { createReadStream } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import { ContentSchema, type Content } from './src/content/schema.js';
import { ProjectSchema, type JsonValue, type ProjectId } from './src/platform/contracts/index.js';
import { createProjectContentRepository } from './src/platform/repositories/projectContentRepository.js';
import { createProjectMetadataRepository } from './src/platform/repositories/projectMetadataRepository.js';
import { createProjectPublicationRepository } from './src/platform/repositories/projectPublicationRepository.js';
import { createProjectSeoConfigRepository } from './src/platform/repositories/projectSeoConfigRepository.js';
import { createProjectVersionRepository } from './src/platform/repositories/projectVersionRepository.js';
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
  listProjectsWithContentLogos,
  updateProjectMetadata,
} from './src/platform/studio/projectsStudioApi.js';
import {
  PublishConnectionPayloadSchema,
  PublishOperationError,
  createProjectZipExport,
  publishProjectArtifact,
  testPublishConnection,
} from './studio-publish-service.js';
import {
  getProjectPublishConfig,
  resolvePublishConnection,
  saveProjectPublishConfig,
} from './studio-publish-config-service.js';
import {
  ClientExportError,
  enrichClientExportWithDownloadUrl,
  exportClientZip,
  getClientExportByFileName,
  getLatestClientExport,
  listClientExports,
} from './src/platform/studio/clientExportService.js';

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
      const projectVersionRepository = createProjectVersionRepository({
        projectsRootDir: projectsDataRoot,
      });

      const loadProjectScopedContent = async (projectId: ProjectId): Promise<Content> => {
        const record = await projectContentRepository.getByProjectId(projectId);
        const baseContent = record ? siteContentFromRecord(record) : await readLegacyContent(contentPath);
        const seoConfig = await projectSeoConfigRepository.getByProjectId(projectId);
        if (!seoConfig) {
          return baseContent;
        }
        return {
          ...baseContent,
          seo: siteSeoFromProjectSeoConfig(seoConfig),
        };
      };

      const saveProjectScopedContent = async (
        projectId: ProjectId,
        payload: unknown,
        options?: { skipVersionSnapshot?: boolean },
      ): Promise<Content> => {
        const content = ContentSchema.parse(payload);
        if (!options?.skipVersionSnapshot) {
          const currentContent = await loadProjectScopedContent(projectId);
          await projectVersionRepository.createSnapshot({
            projectId,
            content: currentContent as unknown as Record<string, JsonValue>,
          });
        }
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
        return content;
      };

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

      // /api/clients — fluxo de exportação estática/ZIP por cliente
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? '/';
        const pathname = new URL(rawUrl, 'http://studio.dev').pathname;
        if (!pathname.startsWith('/api/clients')) {
          return next();
        }

        const base = '/api/clients';
        const rest = pathname.slice(base.length);
        const segments = rest.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

        const sendJson = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        try {
          if (
            req.method === 'POST' &&
            segments.length === 3 &&
            segments[1] === 'deploy' &&
            segments[2] === 'test-connection'
          ) {
            let body = '';
            await new Promise<void>((resolve, reject) => {
              req.on('data', (chunk) => {
                body += chunk.toString();
              });
              req.on('end', () => resolve());
              req.on('error', reject);
            });

            let parsedBody: unknown;
            try {
              parsedBody = body.length > 0 ? JSON.parse(body) : {};
            } catch {
              return sendJson(400, { error: 'JSON inválido' });
            }

            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Cliente não encontrado' });
            }

            const payload = PublishConnectionPayloadSchema.parse(parsedBody);
            await testPublishConnection(payload);
            return sendJson(200, {
              success: true,
              message: `Conexão ${payload.provider.toUpperCase()} validada com sucesso.`,
            });
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'publish-config') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Cliente não encontrado' });
            }

            const config = await getProjectPublishConfig({
              projectId,
              projectsRootDir: projectsDataRoot,
            });
            if (!config) {
              return sendJson(200, { configured: false });
            }

            return sendJson(200, {
              configured: true,
              connection: config.connection,
              updatedAt: config.updatedAt,
            });
          }

          if (req.method === 'PUT' && segments.length === 2 && segments[1] === 'publish-config') {
            let body = '';
            await new Promise<void>((resolve, reject) => {
              req.on('data', (chunk) => {
                body += chunk.toString();
              });
              req.on('end', () => resolve());
              req.on('error', reject);
            });

            let parsedBody: unknown;
            try {
              parsedBody = body.length > 0 ? JSON.parse(body) : {};
            } catch {
              return sendJson(400, { error: 'JSON inválido' });
            }

            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Cliente não encontrado' });
            }

            const payload = PublishConnectionPayloadSchema.parse(parsedBody);
            const config = await saveProjectPublishConfig({
              projectId,
              projectsRootDir: projectsDataRoot,
              connection: payload,
            });
            return sendJson(200, {
              configured: true,
              connection: config.connection,
              updatedAt: config.updatedAt,
            });
          }

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'publish') {
            let body = '';
            await new Promise<void>((resolve, reject) => {
              req.on('data', (chunk) => {
                body += chunk.toString();
              });
              req.on('end', () => resolve());
              req.on('error', reject);
            });

            let parsedBody: unknown;
            try {
              parsedBody = body.length > 0 ? JSON.parse(body) : {};
            } catch {
              return sendJson(400, { error: 'JSON inválido' });
            }

            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Cliente não encontrado' });
            }

            const payload = await resolvePublishConnection({
              projectId,
              projectsRootDir: projectsDataRoot,
              payload: parsedBody,
            });
            const result = await publishProjectArtifact({
              projectId,
              projectsRootDir: projectsDataRoot,
              connection: payload,
            });
            return sendJson(200, result);
          }

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'export-zip') {
            const result = await exportClientZip(segments[0]);
            return sendJson(201, {
              clientId: result.clientId,
              buildPath: result.buildPath,
              buildConfig: result.buildConfig,
              zip: enrichClientExportWithDownloadUrl(result.zip),
            });
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'exports') {
            const items = await listClientExports(segments[0]);
            return sendJson(
              200,
              items.map((item) => enrichClientExportWithDownloadUrl(item)),
            );
          }

          if (req.method === 'GET' && segments.length === 3 && segments[1] === 'exports' && segments[2] === 'latest') {
            const item = await getLatestClientExport(segments[0]);
            if (!item) {
              return sendJson(404, {
                error: 'Nenhum ZIP de exportação disponível para este cliente.',
              });
            }
            return sendJson(200, enrichClientExportWithDownloadUrl(item));
          }

          if (
            req.method === 'GET' &&
            segments.length === 4 &&
            segments[1] === 'exports' &&
            segments[3] === 'download'
          ) {
            const item = await getClientExportByFileName(segments[0], segments[2]);
            const fileBuffer = await fs.readFile(item.absolutePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);
            res.end(fileBuffer);
            return;
          }

          return sendJson(405, { error: 'Método não permitido' });
        } catch (error) {
          if (error instanceof PublishOperationError) {
            return sendJson(500, {
              error: error.message,
              publication: error.publication,
            });
          }
          if (error instanceof z.ZodError) {
            return sendJson(400, {
              error: 'Payload inválido',
              details: error.flatten(),
            });
          }
          if (error instanceof ClientExportError) {
            return sendJson(error.statusCode, {
              error: error.message,
              ...error.payload,
            });
          }
          if (
            error instanceof Error &&
            error.message === 'Configuração de publicação não encontrada para este cliente.'
          ) {
            return sendJson(400, { error: error.message });
          }
          console.error('Erro em /api/clients:', error);
          return sendJson(500, { error: 'Erro ao processar exportação do cliente' });
        }
      });

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
            const items = await listProjectsWithContentLogos(
              projectMetadataRepository,
              projectContentRepository,
            );
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

          if (req.method === 'PUT' && segments.length === 1) {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }
            const updated = await updateProjectMetadata(
              projectMetadataRepository,
              segments[0],
              parsed,
            );
            return sendJson(200, updated);
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'publications') {
            const items = await listProjectPublications(
              projectMetadataRepository,
              projectPublicationRepository,
              segments[0],
            );
            return sendJson(200, items);
          }

          if (
            req.method === 'GET' &&
            segments.length === 3 &&
            segments[1] === 'export' &&
            segments[2] === 'zip'
          ) {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Projeto não encontrado' });
            }

            const zipExport = await createProjectZipExport({
              projectId,
              projectsRootDir: projectsDataRoot,
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipExport.zipFileName}"`);

            const fileStream = createReadStream(zipExport.zipFilePath);
            fileStream.on('error', async (error) => {
              console.error('Erro ao enviar ZIP do projeto:', error);
              if (!res.headersSent) {
                sendJson(500, { error: 'Erro ao exportar ZIP do projeto' });
              } else {
                res.end();
              }
            });
            fileStream.on('close', async () => {
              await fs.unlink(zipExport.zipFilePath).catch(() => undefined);
            });
            fileStream.pipe(res);
            return;
          }

          if (
            req.method === 'POST' &&
            segments.length === 3 &&
            segments[1] === 'deploy' &&
            segments[2] === 'test-connection'
          ) {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }

            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Projeto não encontrado' });
            }

            const payload = PublishConnectionPayloadSchema.parse(parsed);
            await testPublishConnection(payload);
            return sendJson(200, {
              success: true,
              message: `Conexão ${payload.provider.toUpperCase()} validada com sucesso.`,
            });
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'publish-config') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Projeto não encontrado' });
            }

            const config = await getProjectPublishConfig({
              projectId,
              projectsRootDir: projectsDataRoot,
            });
            if (!config) {
              return sendJson(200, { configured: false });
            }

            return sendJson(200, {
              configured: true,
              connection: config.connection,
              updatedAt: config.updatedAt,
            });
          }

          if (req.method === 'PUT' && segments.length === 2 && segments[1] === 'publish-config') {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }

            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Projeto não encontrado' });
            }

            const payload = PublishConnectionPayloadSchema.parse(parsed);
            const config = await saveProjectPublishConfig({
              projectId,
              projectsRootDir: projectsDataRoot,
              connection: payload,
            });
            return sendJson(200, {
              configured: true,
              connection: config.connection,
              updatedAt: config.updatedAt,
            });
          }

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'publish') {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }

            const projectId = parseProjectIdOrThrow(segments[0]);
            const project = await projectMetadataRepository.getByProjectId(projectId);
            if (!project) {
              return sendJson(404, { error: 'Projeto não encontrado' });
            }

            const payload = await resolvePublishConnection({
              projectId,
              projectsRootDir: projectsDataRoot,
              payload: parsed,
            });
            const result = await publishProjectArtifact({
              projectId,
              projectsRootDir: projectsDataRoot,
              connection: payload,
            });
            return sendJson(200, result);
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

          if (req.method === 'POST' && segments.length === 2 && segments[1] === 'export-zip') {
            const result = await exportClientZip(segments[0]);
            return sendJson(201, {
              clientId: result.clientId,
              buildPath: result.buildPath,
              buildConfig: result.buildConfig,
              zip: enrichClientExportWithDownloadUrl(result.zip),
            });
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'exports') {
            const items = await listClientExports(segments[0]);
            return sendJson(
              200,
              items.map((item) => enrichClientExportWithDownloadUrl(item)),
            );
          }

          if (req.method === 'GET' && segments.length === 3 && segments[1] === 'exports' && segments[2] === 'latest') {
            const item = await getLatestClientExport(segments[0]);
            if (!item) {
              return sendJson(404, {
                error: 'Nenhum ZIP de exportação disponível para este cliente.',
              });
            }
            return sendJson(200, enrichClientExportWithDownloadUrl(item));
          }

          if (
            req.method === 'GET' &&
            segments.length === 4 &&
            segments[1] === 'exports' &&
            segments[3] === 'download'
          ) {
            const item = await getClientExportByFileName(segments[0], segments[2]);
            const fileBuffer = await fs.readFile(item.absolutePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);
            res.end(fileBuffer);
            return;
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'content') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const content = await loadProjectScopedContent(projectId);
            return sendJson(200, content);
          }

          if (req.method === 'GET' && segments.length === 2 && segments[1] === 'versions') {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const items = await projectVersionRepository.listByProjectId(projectId);
            return sendJson(
              200,
              items.map((item) => ({
                versionId: item.versionId,
                createdAt: item.createdAt,
              })),
            );
          }

          if (req.method === 'PUT' && segments.length === 2 && segments[1] === 'content') {
            const parsed = await readBody();
            if (parsed === INVALID_JSON) {
              return sendJson(400, { error: 'JSON inválido' });
            }
            const projectId = parseProjectIdOrThrow(segments[0]);
            const content = await saveProjectScopedContent(projectId, parsed);
            return sendJson(200, content);
          }

          if (
            req.method === 'POST' &&
            segments.length === 4 &&
            segments[1] === 'versions' &&
            segments[3] === 'restore'
          ) {
            const projectId = parseProjectIdOrThrow(segments[0]);
            const sourceVersion = await projectVersionRepository.getByProjectIdAndVersionId(
              projectId,
              segments[2],
            );
            if (!sourceVersion) {
              return sendJson(404, { error: 'Versão não encontrada' });
            }

            const currentContent = await loadProjectScopedContent(projectId);
            await projectVersionRepository.createSnapshot({
              projectId,
              content: currentContent as unknown as Record<string, JsonValue>,
            });

            const restored = await saveProjectScopedContent(projectId, sourceVersion.content, {
              skipVersionSnapshot: true,
            });
            return sendJson(200, restored);
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
          if (error instanceof PublishOperationError) {
            return sendJson(500, {
              error: error.message,
              publication: error.publication,
            });
          }
          if (error instanceof ClientExportError) {
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
          if (
            error instanceof Error &&
            error.message === 'Configuração de publicação não encontrada para este cliente.'
          ) {
            return sendJson(400, { error: error.message });
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
