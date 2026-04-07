// Servidor Express para o Studio (API de conteúdo e uploads)
import express, { type Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { ContentSchema, type Content } from './src/content/schema.js';
import { ProjectSchema, type JsonValue, type ProjectId } from './src/platform/contracts/index.js';
import { createProjectContentRepository } from './src/platform/repositories/projectContentRepository.js';
import { createProjectMetadataRepository } from './src/platform/repositories/projectMetadataRepository.js';
import { createProjectPublicationRepository } from './src/platform/repositories/projectPublicationRepository.js';
import { createProjectSeoConfigRepository } from './src/platform/repositories/projectSeoConfigRepository.js';
import { createProjectVersionRepository } from './src/platform/repositories/projectVersionRepository.js';
import {
  createSupabaseProjectContentRepository,
  createSupabaseProjectMetadataRepository,
  createSupabaseProjectPublicationRepository,
  createSupabaseProjectSeoConfigRepository,
  createSupabaseProjectVersionRepository,
  createSupabaseStudioBaseTemplateRepository,
  createSupabaseStudioClient,
  createSupabaseStudioClientTemplateStateRepository,
} from './src/platform/repositories/supabaseStudioRepositories.js';
import {
  STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
  createStudioBaseTemplateRepository,
} from './src/platform/repositories/studioBaseTemplateRepository.js';
import { createStudioClientTemplateStateRepository } from './src/platform/repositories/studioClientTemplateStateRepository.js';
import {
  StudioTemplateContentPathSchema,
  type StudioClientTemplateStateRecord,
} from './src/platform/contracts/studioTemplateInheritance.js';
import {
  buildOverridesFromResolvedContent,
  removeOverridePath,
  resolveClientContent,
  summarizeGlobalDivergenceAcrossClients,
} from './src/platform/studio/templateInheritanceService.js';
import {
  SUPPORTED_TEMPLATE_VARIABLE_KEYS,
  type TemplateVariableMap,
} from './src/lib/templateVariables.js';
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
  deleteProject,
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

/** Raiz opcional para testes de integração (projetos + studio/base-templates); não usar em produção. */
const studioTestDataRoot = process.env.STUDIO_TEST_DATA_ROOT?.trim();
const projectsDataRoot = studioTestDataRoot
  ? path.join(studioTestDataRoot, 'projects')
  : path.join(__dirname, 'data', 'projects');
const studioBaseTemplatesRoot = studioTestDataRoot
  ? path.join(studioTestDataRoot, 'studio', 'base-templates')
  : path.join(__dirname, 'data', 'studio', 'base-templates');
const tmpPath = path.join(os.tmpdir(), 'studio-uploads');
const supabaseStudio = createSupabaseStudioClient({
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'studio-media',
});
const supabaseClient = supabaseStudio?.client ?? null;
const supabaseStorageBucket = supabaseStudio?.storageBucket ?? null;
const supabaseExportsBucket = process.env.SUPABASE_EXPORTS_BUCKET || 'studio-exports';
const hasSupabasePersistence = Boolean(supabaseClient);
const DEFAULT_CLIENT_EXPORT_BASE_PATH = '/pagina/';
const DEFAULT_CLIENT_EXPORT_DOMAIN = 'https://www.efitecsolar.com';

/** Instância alinhada ao layout da ADR; rotas HTTP em cards F2+. */
export const projectMetadataRepository = supabaseClient
  ? createSupabaseProjectMetadataRepository(supabaseClient)
  : createProjectMetadataRepository({
      projectsRootDir: projectsDataRoot,
    });
export const projectContentRepository = supabaseClient
  ? createSupabaseProjectContentRepository(supabaseClient)
  : createProjectContentRepository({
      projectsRootDir: projectsDataRoot,
    });
export const projectPublicationRepository = supabaseClient
  ? createSupabaseProjectPublicationRepository(supabaseClient)
  : createProjectPublicationRepository({
      projectsRootDir: projectsDataRoot,
    });
export const projectSeoConfigRepository = supabaseClient
  ? createSupabaseProjectSeoConfigRepository(supabaseClient)
  : createProjectSeoConfigRepository({
      projectsRootDir: projectsDataRoot,
    });
export const projectVersionRepository = supabaseClient
  ? createSupabaseProjectVersionRepository(supabaseClient)
  : createProjectVersionRepository({
      projectsRootDir: projectsDataRoot,
    });

export const studioBaseTemplateRepository = supabaseClient
  ? createSupabaseStudioBaseTemplateRepository(supabaseClient)
  : createStudioBaseTemplateRepository({
      baseTemplatesDir: studioBaseTemplatesRoot,
    });

export const studioClientTemplateStateRepository = supabaseClient
  ? createSupabaseStudioClientTemplateStateRepository(supabaseClient)
  : createStudioClientTemplateStateRepository({
      projectsRootDir: projectsDataRoot,
    });

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configuração multer para uploads temporários
const upload = multer({
  dest: tmpPath,
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
const artifactsClientsPath = path.join(__dirname, 'artifacts', 'clients');

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

async function applyProjectSeoConfigToContent(projectId: ProjectId, content: Content): Promise<Content> {
  const seoConfig = await projectSeoConfigRepository.getByProjectId(projectId);
  if (!seoConfig) {
    return content;
  }
  return {
    ...content,
    seo: siteSeoFromProjectSeoConfig(seoConfig),
  };
}

/** Conteúdo persistido em `content.json` + overlay de `seo.json` (sem herança). */
async function loadProjectScopedContent(projectIdRaw: string): Promise<Content> {
  const projectId = parseProjectIdOrThrow(projectIdRaw);
  const contentRecord = await projectContentRepository.getByProjectId(projectId);
  const content = contentRecord ? siteContentFromRecord(contentRecord) : await readLegacyContent();
  return applyProjectSeoConfigToContent(projectId, content);
}

export type ProjectContentInheritanceMeta =
  | {
      mode: 'inheritance';
      styleId: string;
      inheritedBaseline: Content;
      overriddenPaths: string[];
      appliedOverrideCount: number;
    }
  | {
      mode: 'legacy';
      reason: 'no_template_state' | 'state_project_mismatch' | 'unsupported_style_id';
    };

/**
 * Conteúdo servido no GET /api/projects/:projectId/content: herança quando há `template-state`
 * compatível; caso contrário o mesmo fluxo de `loadProjectScopedContent`.
 */
async function loadProjectContentForHttpGet(
  projectIdRaw: string,
  options?: { includeInheritanceMeta?: boolean },
): Promise<{ content: Content; inheritanceMeta?: ProjectContentInheritanceMeta }> {
  const projectId = parseProjectIdOrThrow(projectIdRaw);
  const state = await studioClientTemplateStateRepository.getByProjectId(projectId);
  const wantMeta = options?.includeInheritanceMeta === true;

  if (!state) {
    const content = await loadProjectScopedContent(projectIdRaw);
    return {
      content,
      inheritanceMeta: wantMeta ? { mode: 'legacy', reason: 'no_template_state' } : undefined,
    };
  }

  if (state.projectId !== projectId) {
    const content = await loadProjectScopedContent(projectIdRaw);
    return {
      content,
      inheritanceMeta: wantMeta ? { mode: 'legacy', reason: 'state_project_mismatch' } : undefined,
    };
  }

  if (state.styleId !== STYLE_1_TEMPLATE_KEY) {
    const content = await loadProjectScopedContent(projectIdRaw);
    return {
      content,
      inheritanceMeta: wantMeta ? { mode: 'legacy', reason: 'unsupported_style_id' } : undefined,
    };
  }

  const baseTemplate = await getStudioBaseTemplateRecordOrEnsure();
  const resolved = resolveClientContent({ baseTemplate, clientState: state });
  const content = await applyProjectSeoConfigToContent(projectId, resolved.content);

  return {
    content,
    inheritanceMeta: wantMeta
      ? {
          mode: 'inheritance',
          styleId: state.styleId,
          inheritedBaseline: resolved.inheritedBaseline,
          overriddenPaths: resolved.overriddenPaths,
          appliedOverrideCount: resolved.appliedOverrideCount,
        }
      : undefined,
  };
}

const STYLE_1_TEMPLATE_KEY = STUDIO_BASE_TEMPLATE_KEY_STYLE_1;

const PutStudioBaseTemplateBodySchema = z.object({
  content: ContentSchema,
  schemaVersion: z.string().trim().min(1).optional(),
});

const BaseTemplateDivergenceClientsQuerySchema = z.object({
  path: StudioTemplateContentPathSchema,
});

const ResetTemplateFieldBodySchema = z.object({
  path: StudioTemplateContentPathSchema,
});

const ResetTemplateSectionBodySchema = z.object({
  sectionId: z.string().trim().min(1).regex(/^[^./\\]+$/),
});

async function getStudioBaseTemplateRecordOrEnsure() {
  const existing = await studioBaseTemplateRepository.getByTemplateKey(STYLE_1_TEMPLATE_KEY);
  if (existing) {
    return existing;
  }
  return studioBaseTemplateRepository.ensureDefaultStyle1Exists();
}

async function buildGlobalDivergenceResult() {
  const baseTemplate = await getStudioBaseTemplateRecordOrEnsure();
  const projects = await projectMetadataRepository.list();
  const clients = await Promise.all(
    projects.map(async (p) => {
      const resolvedContent = await loadProjectScopedContent(p.projectId);
      const state = await studioClientTemplateStateRepository.getByProjectId(p.projectId);
      return {
        projectId: p.projectId,
        variables: state?.variables ?? {},
        resolvedContent,
      };
    }),
  );
  return summarizeGlobalDivergenceAcrossClients({ baseTemplate, clients });
}

function buildTemplateVariableMapFromContentGlobal(content: Content): TemplateVariableMap {
  const g = content.global as Record<string, unknown>;
  const map: TemplateVariableMap = {};
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_KEYS) {
    const v = g[key];
    map[key] = typeof v === 'string' ? v : '';
  }
  return map;
}

function mergeTemplateVariablesForPut(
  existing: TemplateVariableMap | undefined,
  content: Content,
): TemplateVariableMap {
  return {
    ...(existing ?? {}),
    ...buildTemplateVariableMapFromContentGlobal(content),
  };
}

/**
 * Atualiza `template-state` com overrides derivados do `Content` salvo vs template central `style-1`.
 */
async function persistClientTemplateStateFromPut(projectId: ProjectId, resolvedContent: Content): Promise<void> {
  const baseTemplate = await getStudioBaseTemplateRecordOrEnsure();
  const previousState = await studioClientTemplateStateRepository.getByProjectId(projectId);
  const variables = mergeTemplateVariablesForPut(previousState?.variables, resolvedContent);
  const { overrides, overriddenPaths } = buildOverridesFromResolvedContent({
    baseTemplate,
    variables,
    resolvedContent,
  });
  await studioClientTemplateStateRepository.save({
    projectId,
    styleId: STYLE_1_TEMPLATE_KEY,
    variables,
    overrides,
    overriddenPaths,
    schemaVersion: previousState?.schemaVersion,
    updatedAt: new Date().toISOString(),
  });
}

async function loadClientTemplateStateForReset(projectIdRaw: string): Promise<{
  projectId: ProjectId;
  state: StudioClientTemplateStateRecord;
}> {
  const projectId = parseProjectIdOrThrow(projectIdRaw);
  const state = await studioClientTemplateStateRepository.getByProjectId(projectId);
  if (!state) {
    throw new ProjectsApiError(404, 'Estado de template não encontrado para este projeto');
  }
  if (state.projectId !== projectId) {
    throw new ProjectsApiError(400, 'Estado de template inconsistente');
  }
  if (state.styleId !== STYLE_1_TEMPLATE_KEY) {
    throw new ProjectsApiError(400, 'Reset de override suportado apenas para style-1');
  }
  return { projectId, state };
}

/** Paths de override cuja raiz lógica é a seção (ex.: `hero`, `hero.stats`, `benefits`). */
function listOverriddenPathsInSection(
  overriddenPaths: readonly string[],
  sectionId: string,
): string[] {
  return overriddenPaths.filter((p) => p === sectionId || p.startsWith(`${sectionId}.`));
}

/**
 * Persiste estado atualizado, resolve herança, alinha `content.json` + SEO ao resultado (como no GET).
 */
async function persistTemplateStateAndSyncProjectContent(
  projectId: ProjectId,
  nextState: StudioClientTemplateStateRecord,
): Promise<Content> {
  const toSave: StudioClientTemplateStateRecord = {
    ...nextState,
    updatedAt: new Date().toISOString(),
  };
  await studioClientTemplateStateRepository.save(toSave);
  const baseTemplate = await getStudioBaseTemplateRecordOrEnsure();
  const { content: resolved } = resolveClientContent({
    baseTemplate,
    clientState: toSave,
  });
  const merged = await applyProjectSeoConfigToContent(projectId, resolved);
  await projectContentRepository.save(
    buildProjectContentRecord({ projectId, content: merged }),
  );
  await projectSeoConfigRepository.save(
    buildProjectSeoConfig({ projectId, seo: merged.seo }),
  );
  return merged;
}

async function saveProjectScopedContent(
  projectIdRaw: string,
  payload: unknown,
  options?: { skipVersionSnapshot?: boolean },
): Promise<Content> {
  const projectId = parseProjectIdOrThrow(projectIdRaw);
  const parsed = ContentSchema.parse(payload);
  if (!options?.skipVersionSnapshot) {
    const { content: previousResolved } = await loadProjectContentForHttpGet(projectIdRaw);
    await projectVersionRepository.createSnapshot({
      projectId,
      content: previousResolved as unknown as Record<string, JsonValue>,
    });
  }
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
  await persistClientTemplateStateFromPut(projectId, parsed);
  return parsed;
}

type ProjectContentVersionSummary = {
  versionId: string;
  createdAt: string;
};

function toProjectContentVersionSummary(params: {
  versionId: string;
  createdAt: string;
}): ProjectContentVersionSummary {
  return {
    versionId: params.versionId,
    createdAt: params.createdAt,
  };
}

function getProjectMediaDirectory(projectId: ProjectId, mediaKind: 'img' | 'vid'): string {
  return path.join(mediaProjectsPath, projectId, mediaKind);
}

function getProjectMediaUrl(projectId: ProjectId, mediaKind: 'img' | 'vid', filename: string): string {
  return `/media/projects/${projectId}/${mediaKind}/${filename}`;
}

async function uploadProjectMediaToSupabase(params: {
  projectId: ProjectId;
  mediaKind: 'img' | 'vid';
  filename: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (!supabaseClient || !supabaseStorageBucket) {
    throw new Error('Supabase Storage não configurado');
  }

  const storagePath = `projects/${params.projectId}/${params.mediaKind}/${params.filename}`;
  const { error } = await supabaseClient.storage
    .from(supabaseStorageBucket)
    .upload(storagePath, params.body, {
      upsert: false,
      contentType: params.contentType,
      cacheControl: '3600',
    });
  if (error) {
    throw error;
  }

  const { data } = supabaseClient.storage
    .from(supabaseStorageBucket)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

async function cleanupProjectArtifacts(projectId: ProjectId): Promise<void> {
  await Promise.all([
    fs.rm(path.join(mediaProjectsPath, projectId), { recursive: true, force: true }),
    fs.rm(path.join(artifactsClientsPath, projectId), { recursive: true, force: true }),
  ]);
}

function sendClientExportError(res: Response, error: unknown) {
  if (error instanceof ClientExportError) {
    res.status(error.statusCode).json({
      error: error.message,
      ...error.payload,
    });
    return;
  }
  console.error('Erro no fluxo de exportação ZIP:', error);
  res.status(500).json({ error: 'Erro ao exportar ZIP do cliente' });
}

function normalizeExportBasePath(rawPath: string | undefined): string {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    return DEFAULT_CLIENT_EXPORT_BASE_PATH;
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeExportDomain(rawDomain: string | undefined): string | null {
  const trimmed = rawDomain?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function resolveDomainFromCanonical(canonical: string | undefined, siteUrl: string): string | null {
  const canonicalTrimmed = canonical?.trim();
  if (!canonicalTrimmed) {
    return null;
  }

  try {
    return new URL(canonicalTrimmed).origin;
  } catch {
    // tenta resolver canonical relativa com base no siteUrl.
  }

  const normalizedSiteUrl = normalizeExportDomain(siteUrl);
  if (!normalizedSiteUrl) {
    return null;
  }

  try {
    return new URL(canonicalTrimmed, normalizedSiteUrl).origin;
  } catch {
    return null;
  }
}

function resolveClientExportBuildConfig(content: Content): { basePath: string; domain: string } {
  const contentBasePath = content.global.buildBasePath?.trim();
  const envBasePathRaw = process.env.VITE_PROJECT_BASE_PATH || process.env.PROJECT_BASE_PATH;
  const envBasePath = envBasePathRaw?.trim() === '/' ? undefined : envBasePathRaw;
  const envDomain = normalizeExportDomain(process.env.VITE_PROJECT_DOMAIN || process.env.PROJECT_DOMAIN);
  const contentDomain =
    normalizeExportDomain(content.global.siteUrl) ||
    resolveDomainFromCanonical(content.seo.canonical, content.global.siteUrl);

  return {
    basePath: normalizeExportBasePath(contentBasePath || envBasePath),
    domain:
      contentDomain ||
      envDomain ||
      DEFAULT_CLIENT_EXPORT_DOMAIN,
  };
}

async function runSynchronousClientZipExport(clientIdRaw: string) {
  const clientId = parseProjectIdOrThrow(clientIdRaw);
  const project = await projectMetadataRepository.getByProjectId(clientId);
  if (!project) {
    throw new ProjectsApiError(404, 'Cliente não encontrado');
  }

  const content = await loadProjectScopedContent(clientId);
  const buildConfig = resolveClientExportBuildConfig(content);
  return exportClientZip({
    clientIdRaw: clientId,
    content,
    buildConfig,
    supabaseClient,
    exportsBucket: supabaseExportsBucket,
  });
}

// Garantir que diretórios existem
async function ensureDirectories() {
  if (process.env.VERCEL) {
    await fs.mkdir(tmpPath, { recursive: true });
    return;
  }
  await fs.mkdir(mediaImgPath, { recursive: true });
  await fs.mkdir(mediaVidPath, { recursive: true });
  await fs.mkdir(mediaProjectsPath, { recursive: true });
  await fs.mkdir(projectsDataRoot, { recursive: true });
  await fs.mkdir(studioBaseTemplatesRoot, { recursive: true });
  await fs.mkdir(tmpPath, { recursive: true });
}

ensureDirectories();

// GET /api/projects — lista metadados de projetos
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await listProjectsWithContentLogos(
      projectMetadataRepository,
      projectContentRepository,
    );
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

// PUT /api/projects/:projectId — atualiza metadata mínima do projeto
app.put('/api/projects/:projectId', async (req, res) => {
  try {
    const updated = await updateProjectMetadata(
      projectMetadataRepository,
      req.params.projectId,
      req.body,
    );
    res.json(updated);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ error: 'Erro ao atualizar projeto' });
  }
});

// DELETE /api/projects/:projectId — remove projeto e dados relacionados
app.delete('/api/projects/:projectId', async (req, res) => {
  try {
    const removedProject = await deleteProject(projectMetadataRepository, req.params.projectId);
    await cleanupProjectArtifacts(removedProject.projectId);
    res.json(removedProject);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({ error: 'Erro ao deletar projeto' });
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

// GET /api/projects/:projectId/export/zip — exportação de artefato em ZIP
app.get('/api/projects/:projectId/export/zip', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const zipExport = await createProjectZipExport({
      projectId,
      projectsRootDir: projectsDataRoot,
    });

    res.download(zipExport.zipFilePath, zipExport.zipFileName, async (error) => {
      await fs.unlink(zipExport.zipFilePath).catch(() => undefined);
      if (!error) {
        return;
      }
      console.error('Erro ao enviar ZIP do projeto:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao exportar ZIP do projeto' });
      }
    });
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
    console.error('Erro ao exportar ZIP do projeto:', error);
    res.status(500).json({ error: 'Erro ao exportar ZIP do projeto' });
  }
});

// POST /api/projects/:projectId/deploy/test-connection — valida conexão FTP/SFTP
app.post('/api/projects/:projectId/deploy/test-connection', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const payload = PublishConnectionPayloadSchema.parse(req.body);
    await testPublishConnection(payload);

    res.json({
      success: true,
      message: `Conexão ${payload.provider.toUpperCase()} validada com sucesso.`,
    });
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
    console.error('Erro ao testar conexão de publicação:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha no teste de conexão' });
  }
});

// GET /api/projects/:projectId/publish-config — retorna configuração de publicação salva
app.get('/api/projects/:projectId/publish-config', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const config = await getProjectPublishConfig({
      projectId,
      projectsRootDir: projectsDataRoot,
    });
    if (!config) {
      return res.json({ configured: false });
    }

    res.json({
      configured: true,
      connection: config.connection,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    res.status(500).json({ error: 'Erro ao ler configuração de publicação do projeto' });
  }
});

// PUT /api/projects/:projectId/publish-config — salva configuração de publicação
app.put('/api/projects/:projectId/publish-config', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const payload = PublishConnectionPayloadSchema.parse(req.body);
    const config = await saveProjectPublishConfig({
      projectId,
      projectsRootDir: projectsDataRoot,
      connection: payload,
    });

    res.json({
      configured: true,
      connection: config.connection,
      updatedAt: config.updatedAt,
    });
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
    console.error('Erro ao salvar configuração de publicação do projeto:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração de publicação do projeto' });
  }
});

// POST /api/projects/:projectId/publish — publica artefato para hospedagem compartilhada
app.post('/api/projects/:projectId/publish', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const payload = await resolvePublishConnection({
      projectId,
      projectsRootDir: projectsDataRoot,
      payload: req.body,
    });
    const result = await publishProjectArtifact({
      projectId,
      projectsRootDir: projectsDataRoot,
      connection: payload,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    if (error instanceof PublishOperationError) {
      return res.status(500).json({
        error: error.message,
        publication: error.publication,
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload inválido',
        details: error.flatten(),
      });
    }
    if (
      error instanceof Error &&
      error.message === 'Configuração de publicação não encontrada para este cliente.'
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao publicar projeto:', error);
    res.status(500).json({ error: 'Falha ao publicar projeto' });
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

// POST /api/clients/:clientId/deploy/test-connection — alias em linguagem de cliente
app.post('/api/clients/:clientId/deploy/test-connection', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.clientId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const payload = PublishConnectionPayloadSchema.parse(req.body);
    await testPublishConnection(payload);

    res.json({
      success: true,
      message: `Conexão ${payload.provider.toUpperCase()} validada com sucesso.`,
    });
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
    console.error('Erro ao testar conexão de publicação do cliente:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha no teste de conexão' });
  }
});

// GET /api/clients/:clientId/publish-config — retorna configuração de publicação salva
app.get('/api/clients/:clientId/publish-config', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.clientId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const config = await getProjectPublishConfig({
      projectId,
      projectsRootDir: projectsDataRoot,
    });
    if (!config) {
      return res.json({ configured: false });
    }

    res.json({
      configured: true,
      connection: config.connection,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    res.status(500).json({ error: 'Erro ao ler configuração de publicação do cliente' });
  }
});

// PUT /api/clients/:clientId/publish-config — salva configuração de publicação
app.put('/api/clients/:clientId/publish-config', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.clientId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const payload = PublishConnectionPayloadSchema.parse(req.body);
    const config = await saveProjectPublishConfig({
      projectId,
      projectsRootDir: projectsDataRoot,
      connection: payload,
    });

    res.json({
      configured: true,
      connection: config.connection,
      updatedAt: config.updatedAt,
    });
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
    console.error('Erro ao salvar configuração de publicação do cliente:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração de publicação do cliente' });
  }
});

// POST /api/clients/:clientId/publish — alias em linguagem de cliente
app.post('/api/clients/:clientId/publish', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.clientId);
    const project = await projectMetadataRepository.getByProjectId(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const payload = await resolvePublishConnection({
      projectId,
      projectsRootDir: projectsDataRoot,
      payload: req.body,
    });
    const result = await publishProjectArtifact({
      projectId,
      projectsRootDir: projectsDataRoot,
      connection: payload,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    if (error instanceof PublishOperationError) {
      return res.status(500).json({
        error: error.message,
        publication: error.publication,
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload inválido',
        details: error.flatten(),
      });
    }
    if (
      error instanceof Error &&
      error.message === 'Configuração de publicação não encontrada para este cliente.'
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao publicar cliente:', error);
    res.status(500).json({ error: 'Falha ao publicar cliente' });
  }
});

// DELETE /api/clients/:clientId — alias em linguagem de cliente
app.delete('/api/clients/:clientId', async (req, res) => {
  try {
    const removedProject = await deleteProject(projectMetadataRepository, req.params.clientId);
    await cleanupProjectArtifacts(removedProject.projectId);
    res.json(removedProject);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

// POST /api/clients/:clientId/export-zip — exportação síncrona via template prebuildado
app.post('/api/clients/:clientId/export-zip', async (req, res) => {
  try {
    const result = await runSynchronousClientZipExport(req.params.clientId);
    res.status(201).json({
      clientId: result.clientId,
      buildPath: result.buildPath,
      buildConfig: result.buildConfig,
      zip: enrichClientExportWithDownloadUrl(result.zip),
    });
  } catch (error) {
    sendClientExportError(res, error);
  }
});

// GET /api/clients/:clientId/exports — lista exports ZIP disponíveis do cliente
app.get('/api/clients/:clientId/exports', async (req, res) => {
  try {
    const items = await listClientExports(req.params.clientId);
    res.json(items.map((item) => enrichClientExportWithDownloadUrl(item)));
  } catch (error) {
    sendClientExportError(res, error);
  }
});

// GET /api/clients/:clientId/exports/latest — retorna metadado do ZIP mais recente
app.get('/api/clients/:clientId/exports/latest', async (req, res) => {
  try {
    const item = await getLatestClientExport(req.params.clientId);
    if (!item) {
      return res.status(404).json({ error: 'Nenhum ZIP de exportação disponível para este cliente.' });
    }
    res.json(enrichClientExportWithDownloadUrl(item));
  } catch (error) {
    sendClientExportError(res, error);
  }
});

// GET /api/clients/:clientId/exports/:fileName/download — download de ZIP por arquivo
app.get('/api/clients/:clientId/exports/:fileName/download', async (req, res) => {
  try {
    const item = await getClientExportByFileName(req.params.clientId, req.params.fileName);
    res.download(item.absolutePath, item.fileName);
  } catch (error) {
    sendClientExportError(res, error);
  }
});

// Compatibilidade: mesma exportação usando namespace legado `/api/projects`.
app.post('/api/projects/:projectId/export-zip', async (req, res) => {
  try {
    const result = await runSynchronousClientZipExport(req.params.projectId);
    res.status(201).json({
      clientId: result.clientId,
      buildPath: result.buildPath,
      buildConfig: result.buildConfig,
      zip: enrichClientExportWithDownloadUrl(result.zip),
    });
  } catch (error) {
    sendClientExportError(res, error);
  }
});

app.get('/api/projects/:projectId/exports', async (req, res) => {
  try {
    const items = await listClientExports(req.params.projectId);
    res.json(items.map((item) => enrichClientExportWithDownloadUrl(item)));
  } catch (error) {
    sendClientExportError(res, error);
  }
});

app.get('/api/projects/:projectId/exports/latest', async (req, res) => {
  try {
    const item = await getLatestClientExport(req.params.projectId);
    if (!item) {
      return res.status(404).json({ error: 'Nenhum ZIP de exportação disponível para este cliente.' });
    }
    res.json(enrichClientExportWithDownloadUrl(item));
  } catch (error) {
    sendClientExportError(res, error);
  }
});

app.get('/api/projects/:projectId/exports/:fileName/download', async (req, res) => {
  try {
    const item = await getClientExportByFileName(req.params.projectId, req.params.fileName);
    res.download(item.absolutePath, item.fileName);
  } catch (error) {
    sendClientExportError(res, error);
  }
});

// GET /api/projects/:projectId/content — Content resolvido (herança + seo) ou legado; ?includeInheritanceMeta=1 envolve em { content, inheritanceMeta }
app.get('/api/projects/:projectId/content', async (req, res) => {
  try {
    const includeMeta =
      req.query.includeInheritanceMeta === '1' || req.query.includeInheritanceMeta === 'true';
    const { content, inheritanceMeta } = await loadProjectContentForHttpGet(req.params.projectId, {
      includeInheritanceMeta: includeMeta,
    });
    if (includeMeta) {
      return res.json({
        content,
        inheritanceMeta:
          inheritanceMeta ??
          ({ mode: 'legacy', reason: 'no_template_state' } satisfies ProjectContentInheritanceMeta),
      });
    }
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

// GET /api/projects/:projectId/versions — lista versões de conteúdo do projeto
app.get('/api/projects/:projectId/versions', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const items = await projectVersionRepository.listByProjectId(projectId);
    res.json(
      items.map((item) =>
        toProjectContentVersionSummary({
          versionId: item.versionId,
          createdAt: item.createdAt,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    console.error('Erro ao listar versões do projeto:', error);
    res.status(500).json({ error: 'Erro ao listar versões do projeto' });
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

// POST /api/projects/:projectId/template-state/reset-field — remove override em uma path (bloco ou campo simples)
app.post('/api/projects/:projectId/template-state/reset-field', async (req, res) => {
  try {
    const body = ResetTemplateFieldBodySchema.parse(req.body);
    const { projectId, state } = await loadClientTemplateStateForReset(req.params.projectId);
    const nextState = removeOverridePath({ clientState: state, path: body.path });
    const content = await persistTemplateStateAndSyncProjectContent(projectId, nextState);
    res.json(content);
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
    console.error('Erro ao resetar campo do template-state:', error);
    res.status(500).json({ error: 'Erro ao resetar override' });
  }
});

// POST /api/projects/:projectId/template-state/reset-section — remove todos os overrides da seção (respeita paths de blocos compostos)
app.post('/api/projects/:projectId/template-state/reset-section', async (req, res) => {
  try {
    const body = ResetTemplateSectionBodySchema.parse(req.body);
    const { projectId, state } = await loadClientTemplateStateForReset(req.params.projectId);
    const toClear = listOverriddenPathsInSection(state.overriddenPaths, body.sectionId);
    let nextState = state;
    for (const p of [...toClear].sort()) {
      nextState = removeOverridePath({ clientState: nextState, path: p });
    }
    const content = await persistTemplateStateAndSyncProjectContent(projectId, nextState);
    res.json(content);
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
    console.error('Erro ao resetar seção do template-state:', error);
    res.status(500).json({ error: 'Erro ao resetar overrides da seção' });
  }
});

// --- Template central Estilo 1 (style-1) ---

// GET /api/studio/base-templates/style-1 — registro do template base
app.get('/api/studio/base-templates/style-1', async (_req, res) => {
  try {
    const record = await getStudioBaseTemplateRecordOrEnsure();
    res.json({
      templateKey: STYLE_1_TEMPLATE_KEY,
      styleId: record.styleId,
      schemaVersion: record.schemaVersion ?? null,
      content: record.content,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Template inválido ao carregar',
        details: error.flatten(),
      });
    }
    console.error('Erro ao ler template base style-1:', error);
    res.status(500).json({ error: 'Erro ao ler template base' });
  }
});

// PUT /api/studio/base-templates/style-1 — atualiza conteúdo do template base
app.put('/api/studio/base-templates/style-1', async (req, res) => {
  try {
    const body = PutStudioBaseTemplateBodySchema.parse(req.body);
    const existing = await studioBaseTemplateRepository.getByTemplateKey(STYLE_1_TEMPLATE_KEY);
    const ts = new Date().toISOString();
    const saved = await studioBaseTemplateRepository.save({
      styleId: STYLE_1_TEMPLATE_KEY,
      content: body.content,
      schemaVersion: body.schemaVersion,
      updatedAt: ts,
      createdAt: existing?.createdAt ?? ts,
    });
    res.json({
      templateKey: STYLE_1_TEMPLATE_KEY,
      styleId: saved.styleId,
      schemaVersion: saved.schemaVersion ?? null,
      content: saved.content,
      updatedAt: saved.updatedAt,
      createdAt: saved.createdAt ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload inválido',
        details: error.flatten(),
      });
    }
    console.error('Erro ao salvar template base style-1:', error);
    res.status(500).json({ error: 'Erro ao salvar template base' });
  }
});

// GET /api/studio/base-templates/style-1/divergence/clients — clientes divergentes em uma path
app.get('/api/studio/base-templates/style-1/divergence/clients', async (req, res) => {
  try {
    const query = BaseTemplateDivergenceClientsQuerySchema.parse({
      path: typeof req.query.path === 'string' ? req.query.path : '',
    });
    const { fieldSummaries } = await buildGlobalDivergenceResult();
    const hit = fieldSummaries.find((f) => f.path === query.path);
    res.json({
      templateKey: STYLE_1_TEMPLATE_KEY,
      path: query.path,
      divergentClientCount: hit?.divergentClientCount ?? 0,
      divergentProjectIds: hit?.divergentProjectIds ?? [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Query inválida',
        details: error.flatten(),
      });
    }
    console.error('Erro ao listar divergência por path (style-1):', error);
    res.status(500).json({ error: 'Erro ao calcular divergência' });
  }
});

// GET /api/studio/base-templates/style-1/divergence — divergência agregada (todos os projetos)
app.get('/api/studio/base-templates/style-1/divergence', async (_req, res) => {
  try {
    const { fieldSummaries, sectionSummaries } = await buildGlobalDivergenceResult();
    res.json({
      templateKey: STYLE_1_TEMPLATE_KEY,
      fieldSummaries,
      sectionSummaries,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos para divergência',
        details: error.flatten(),
      });
    }
    console.error('Erro ao calcular divergência global (style-1):', error);
    res.status(500).json({ error: 'Erro ao calcular divergência' });
  }
});

// POST /api/projects/:projectId/versions/:versionId/restore — restaura versão no conteúdo atual
app.post('/api/projects/:projectId/versions/:versionId/restore', async (req, res) => {
  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const sourceVersion = await projectVersionRepository.getByProjectIdAndVersionId(
      projectId,
      req.params.versionId,
    );
    if (!sourceVersion) {
      return res.status(404).json({ error: 'Versão não encontrada' });
    }

    const currentContent = await loadProjectScopedContent(projectId);
    await projectVersionRepository.createSnapshot({
      projectId,
      content: currentContent as unknown as Record<string, JsonValue>,
    });

    const restored = await saveProjectScopedContent(projectId, sourceVersion.content, {
      skipVersionSnapshot: true,
    });
    res.json(restored);
  } catch (error) {
    if (error instanceof ProjectsApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.payload,
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Versão inválida para restauração',
        details: error.flatten(),
      });
    }
    console.error('Erro ao restaurar versão do projeto:', error);
    res.status(500).json({ error: 'Erro ao restaurar versão do projeto' });
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
  } catch (error: unknown) {
    console.error('Erro ao salvar conteúdo:', error);
    const message = error instanceof Error && error.message ? error.message : 'Erro ao validar conteúdo';
    res.status(400).json({ error: message });
  }
});

// POST /api/projects/:projectId/upload-image - Upload no escopo do projeto
app.post('/api/projects/:projectId/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }

  try {
    const projectId = parseProjectIdOrThrow(req.params.projectId);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const optimizedBuffer = await sharp(req.file.path)
      .webp({ quality: 75 })
      .resize(1920, null, { withoutEnlargement: true })
      .toBuffer();

    await fs.unlink(req.file.path);

    if (hasSupabasePersistence) {
      const uploadedUrl = await uploadProjectMediaToSupabase({
        projectId,
        mediaKind: 'img',
        filename,
        body: optimizedBuffer,
        contentType: 'image/webp',
      });
      return res.json({
        projectId,
        url: uploadedUrl,
        filename,
      });
    }

    const projectMediaImgPath = getProjectMediaDirectory(projectId, 'img');
    await fs.mkdir(projectMediaImgPath, { recursive: true });
    const outputPath = path.join(projectMediaImgPath, filename);
    await fs.writeFile(outputPath, optimizedBuffer);

    const sizes = [768, 1280];
    for (const size of sizes) {
      const variantPath = path.join(
        projectMediaImgPath,
        `${filename.replace('.webp', '')}-${size}.webp`,
      );
      await sharp(optimizedBuffer)
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
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const ext = path.extname(req.file.originalname);
    const savedFilename = `${filename}${ext}`;
    const fileBuffer = await fs.readFile(req.file.path);
    await fs.unlink(req.file.path);
    const posterFilename = `${filename}-poster.webp`;

    if (hasSupabasePersistence) {
      const uploadedUrl = await uploadProjectMediaToSupabase({
        projectId,
        mediaKind: 'vid',
        filename: savedFilename,
        body: fileBuffer,
        contentType: req.file.mimetype || 'application/octet-stream',
      });
      return res.json({
        projectId,
        url: uploadedUrl,
        filename: savedFilename,
        poster: '',
      });
    }

    const projectMediaVidPath = getProjectMediaDirectory(projectId, 'vid');
    await fs.mkdir(projectMediaVidPath, { recursive: true });
    const outputPath = path.join(projectMediaVidPath, savedFilename);
    await fs.writeFile(outputPath, fileBuffer);

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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
