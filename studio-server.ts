// Servidor Express para o Studio (API de conteúdo e uploads)
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
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

const projectsDataRoot = path.join(__dirname, 'data', 'projects');

/** Instância alinhada ao layout da ADR; rotas HTTP em cards F2+. */
export const projectMetadataRepository = createProjectMetadataRepository({
  projectsRootDir: projectsDataRoot,
});
export const projectContentRepository = createProjectContentRepository({
  projectsRootDir: projectsDataRoot,
});
export const projectPublicationRepository = createProjectPublicationRepository({
  projectsRootDir: projectsDataRoot,
});
export const projectSeoConfigRepository = createProjectSeoConfigRepository({
  projectsRootDir: projectsDataRoot,
});

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configuração multer para uploads temporários
const upload = multer({
  dest: 'tmp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  },
});

// Diretórios
const contentPath = path.join(__dirname, 'content', 'content.json');
const mediaImgPath = path.join(__dirname, 'public', 'media', 'img');
const mediaVidPath = path.join(__dirname, 'public', 'media', 'vid');
const mediaProjectsPath = path.join(__dirname, 'public', 'media', 'projects');

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

async function readLegacyContent(): Promise<Content> {
  const raw = await fs.readFile(contentPath, 'utf-8');
  return parseGlobalSiteContentJson(JSON.parse(raw));
}

async function loadProjectScopedContent(projectIdRaw: string): Promise<Content> {
  const projectId = parseProjectIdOrThrow(projectIdRaw);
  const contentRecord = await projectContentRepository.getByProjectId(projectId);
  const content = contentRecord ? siteContentFromRecord(contentRecord) : await readLegacyContent();
  const seoConfig = await projectSeoConfigRepository.getByProjectId(projectId);
  if (!seoConfig) {
    return content;
  }
  return {
    ...content,
    seo: siteSeoFromProjectSeoConfig(seoConfig),
  };
}

async function saveProjectScopedContent(projectIdRaw: string, payload: unknown): Promise<Content> {
  const projectId = parseProjectIdOrThrow(projectIdRaw);
  const parsed = ContentSchema.parse(payload);
  const record = buildProjectContentRecord({
    projectId,
    content: parsed,
  });
  await projectContentRepository.save(record);
  await projectSeoConfigRepository.save(
    buildProjectSeoConfig({
      projectId,
      seo: parsed.seo,
    }),
  );
  return parsed;
}

function getProjectMediaDirectory(projectId: ProjectId, mediaKind: 'img' | 'vid'): string {
  return path.join(mediaProjectsPath, projectId, mediaKind);
}

function getProjectMediaUrl(projectId: ProjectId, mediaKind: 'img' | 'vid', filename: string): string {
  return `/media/projects/${projectId}/${mediaKind}/${filename}`;
}

// Garantir que diretórios existem
async function ensureDirectories() {
  await fs.mkdir(mediaImgPath, { recursive: true });
  await fs.mkdir(mediaVidPath, { recursive: true });
  await fs.mkdir(mediaProjectsPath, { recursive: true });
  await fs.mkdir(projectsDataRoot, { recursive: true });
  await fs.mkdir(path.join(__dirname, 'tmp'), { recursive: true });
}

ensureDirectories();

// GET /api/projects — lista metadados de projetos
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await listProjects(projectMetadataRepository);
    res.json(projects);
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({ error: 'Erro ao listar projetos' });
  }
});

// GET /api/projects/:projectId — metadados de um projeto
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const project = await getProjectById(projectMetadataRepository, req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }
    res.json(project);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao ler projeto:', error);
    res.status(500).json({ error: 'Erro ao ler projeto' });
  }
});

// POST /api/projects — cria projeto (metadados)
app.post('/api/projects', async (req, res) => {
  try {
    const saved = await createProject(projectMetadataRepository, req.body);
    res.status(201).json(saved);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: 'Erro ao criar projeto' });
  }
});

// GET /api/projects/:projectId/publications — histórico básico de publicações
app.get('/api/projects/:projectId/publications', async (req, res) => {
  try {
    const items = await listProjectPublications(
      projectMetadataRepository,
      projectPublicationRepository,
      req.params.projectId,
    );
    res.json(items);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao listar publicações do projeto:', error);
    res.status(500).json({ error: 'Erro ao listar publicações do projeto' });
  }
});

// POST /api/projects/:projectId/duplicate — duplicação mínima de metadata + content
app.post('/api/projects/:projectId/duplicate', async (req, res) => {
  try {
    const duplicated = await duplicateProject(
      projectMetadataRepository,
      projectContentRepository,
      req.params.projectId,
      req.body,
    );
    res.status(201).json(duplicated);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao duplicar projeto:', error);
    res.status(500).json({ error: 'Erro ao duplicar projeto' });
  }
});

// GET /api/projects/:projectId/content — conteúdo no escopo do projeto (fallback legado)
app.get('/api/projects/:projectId/content', async (req, res) => {
  try {
    const content = await loadProjectScopedContent(req.params.projectId);
    res.json(content);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao ler conteúdo do projeto:', error);
    res.status(500).json({ error: 'Erro ao ler conteúdo do projeto' });
  }
});

// PUT /api/projects/:projectId/content — salva conteúdo no escopo do projeto
app.put('/api/projects/:projectId/content', async (req, res) => {
  try {
    const saved = await saveProjectScopedContent(req.params.projectId, req.body);
    res.json(saved);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload inválido',
        details: error.flatten(),
      });
    }
    console.error('Erro ao salvar conteúdo do projeto:', error);
    res.status(500).json({ error: 'Erro ao salvar conteúdo do projeto' });
  }
});

// GET /api/content - Retorna conteúdo atual
app.get('/api/content', async (req, res) => {
  try {
    const content = await fs.readFile(contentPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Erro ao ler conteúdo:', error);
    res.status(500).json({ error: 'Erro ao ler conteúdo' });
  }
});

// PUT /api/content - Salva conteúdo
app.put('/api/content', async (req, res) => {
  try {
    const content = ContentSchema.parse(req.body);
    await fs.writeFile(contentPath, JSON.stringify(content, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao salvar conteúdo:', error);
    res.status(400).json({ error: error.message || 'Erro ao validar conteúdo' });
  }
});

// POST /api/projects/:projectId/upload-image - Upload no escopo do projeto
app.post('/api/projects/:projectId/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }

  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const projectMediaImgPath = getProjectMediaDirectory(projectId, 'img');
    await fs.mkdir(projectMediaImgPath, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const outputPath = path.join(projectMediaImgPath, filename);

    await sharp(req.file.path)
      .webp({ quality: 75 })
      .resize(1920, null, { withoutEnlargement: true })
      .toFile(outputPath);

    await fs.unlink(req.file.path);

    const sizes = [768, 1280];
    for (const size of sizes) {
      const variantPath = path.join(projectMediaImgPath, `${filename.replace('.webp', '')}-${size}.webp`);
      await sharp(outputPath)
        .resize(size, null, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(variantPath);
    }

    res.json({
      projectId,
      url: getProjectMediaUrl(projectId, 'img', filename),
      filename,
    });
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao processar imagem do projeto:', error);
    try {
      await fs.unlink(req.file.path);
    } catch {
      // noop: melhor esforço na limpeza de arquivo temporário
    }
    res.status(500).json({ error: 'Erro ao processar imagem do projeto' });
  }
});

// POST /api/projects/:projectId/upload-video - Upload no escopo do projeto
app.post('/api/projects/:projectId/upload-video', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum vídeo enviado' });
  }

  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const projectMediaVidPath = getProjectMediaDirectory(projectId, 'vid');
    await fs.mkdir(projectMediaVidPath, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const ext = path.extname(req.file.originalname);
    const savedFilename = `${filename}${ext}`;
    const outputPath = path.join(projectMediaVidPath, savedFilename);

    await fs.copyFile(req.file.path, outputPath);
    await fs.unlink(req.file.path);

    const posterFilename = `${filename}-poster.webp`;

    res.json({
      projectId,
      url: getProjectMediaUrl(projectId, 'vid', savedFilename),
      filename: savedFilename,
      poster: getProjectMediaUrl(projectId, 'img', posterFilename),
    });
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao processar vídeo do projeto:', error);
    try {
      await fs.unlink(req.file.path);
    } catch {
      // noop: melhor esforço na limpeza de arquivo temporário
    }
    res.status(500).json({ error: 'Erro ao processar vídeo do projeto' });
  }
});

// POST /api/upload-image - Upload e conversão de imagem para WebP
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }

  try {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const outputPath = path.join(mediaImgPath, filename);

    // Converte para WebP com Sharp
    await sharp(req.file.path)
      .webp({ quality: 75 })
      .resize(1920, null, { withoutEnlargement: true })
      .toFile(outputPath);

    // Remove arquivo temporário
    await fs.unlink(req.file.path);

    // Gera variações de tamanho
    const sizes = [768, 1280];
    for (const size of sizes) {
      const variantPath = path.join(mediaImgPath, `${filename.replace('.webp', '')}-${size}.webp`);
      await sharp(outputPath)
        .resize(size, null, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(variantPath);
    }

    res.json({ 
      url: `/media/img/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error('Erro ao processar imagem:', error);
    // Limpa arquivo temporário em caso de erro
    try {
      await fs.unlink(req.file.path);
    } catch {
      // noop: melhor esforço na limpeza de arquivo temporário
    }
    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
});

// POST /api/upload-video - Upload e conversão de vídeo
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum vídeo enviado' });
  }

  try {
    // Para produção, você precisaria usar ffmpeg-static
    // Por enquanto, apenas move o arquivo
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const ext = path.extname(req.file.originalname);
    const outputPath = path.join(mediaVidPath, `${filename}${ext}`);

    await fs.copyFile(req.file.path, outputPath);
    await fs.unlink(req.file.path);

    // Gera poster (primeiro frame como imagem)
    const posterFilename = `${filename}-poster.webp`;
    const posterPath = path.join(mediaImgPath, posterFilename);
    
    // Se tiver ffmpeg instalado, pode gerar poster aqui
    // Por enquanto, retorna sem poster

    res.json({
      url: `/media/vid/${filename}${ext}`,
      filename: `${filename}${ext}`,
      poster: `/media/img/${posterFilename}`, // Pode estar vazio se não gerar
    });
  } catch (error: any) {
    console.error('Erro ao processar vídeo:', error);
    try {
      await fs.unlink(req.file.path);
    } catch {
      // noop: melhor esforço na limpeza de arquivo temporário
    }
    res.status(500).json({ error: 'Erro ao processar vídeo' });
  }
});

export default app;
