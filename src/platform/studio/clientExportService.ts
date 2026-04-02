import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import archiver from 'archiver';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ProjectSchema, type ProjectId } from '../contracts/index.js';

const DEFAULT_BASE_PATH = '/pagina/';
const DEFAULT_DOMAIN = 'https://www.efitecsolar.com';
const DEFAULT_EXPORTS_BUCKET = 'studio-exports';
const REPO_ROOT = path.resolve('.');
const TEMPLATE_ROOT = path.join(REPO_ROOT, '.export-template', 'current');
const TEMPLATE_SITE_ROOT = path.join(TEMPLATE_ROOT, 'site');
const TEMPLATE_METADATA_PATH = path.join(TEMPLATE_ROOT, 'metadata.json');
const IS_SERVERLESS_RUNTIME = Boolean(process.env.VERCEL);
const WORK_ROOT = IS_SERVERLESS_RUNTIME ? path.join(os.tmpdir(), 'studio-export-runtime') : REPO_ROOT;
const ARTIFACTS_ROOT = path.join(WORK_ROOT, 'artifacts', 'clients');
const TEMP_WORKSPACES_ROOT = path.join(WORK_ROOT, '.tmp', 'export-workspaces');

const TEXT_FILE_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.txt',
  '.xml',
  '.svg',
  '.map',
]);

const TEXT_FILE_BASENAMES = new Set(['.htaccess', 'robots.txt', 'sitemap.xml']);

type TemplateMetadata = {
  basePathPlaceholder: string;
};

type SupabaseUploadResult = {
  storagePath: string;
  downloadUrl?: string;
};

type NormalizedExportClientZipParams = {
  clientId: ProjectId;
  content: unknown;
  buildConfig: ClientExportBuildConfig;
  supabaseClient: SupabaseClient | null;
  exportsBucket: string;
};

export class ClientExportError extends Error {
  readonly statusCode: number;
  readonly payload?: Record<string, unknown>;

  constructor(statusCode: number, message: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ClientExportError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export type ClientExportBuildConfig = {
  basePath: string;
  domain: string;
};

export type ClientExportZipArtifact = {
  clientId: ProjectId;
  fileName: string;
  absolutePath: string;
  storagePath?: string;
  sizeInBytes: number;
  createdAt: string;
  downloadUrl?: string;
};

type ClientExportZipArtifactLike = {
  clientId: ProjectId;
  fileName: string;
  absolutePath?: string;
  storagePath?: string;
  sizeInBytes: number;
  createdAt: string;
  downloadUrl?: string;
};

export type ExportClientZipParams = {
  clientIdRaw: string;
  content: unknown;
  buildConfig: ClientExportBuildConfig;
  supabaseClient?: SupabaseClient | null;
  exportsBucket?: string;
};

export type ExportClientZipResult = {
  clientId: ProjectId;
  buildPath: string;
  zip: {
    clientId: ProjectId;
    fileName: string;
    absolutePath?: string;
    storagePath?: string;
    sizeInBytes: number;
    createdAt: string;
    downloadUrl?: string;
  };
  buildConfig: ClientExportBuildConfig;
};

function parseClientIdOrThrow(clientIdRaw: string): ProjectId {
  try {
    return ProjectSchema.parse({ projectId: clientIdRaw }).projectId;
  } catch {
    throw new ClientExportError(400, 'clientId inválido');
  }
}

function normalizeBasePath(rawPath: string | undefined): string {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    return DEFAULT_BASE_PATH;
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeDomain(rawDomain: string | undefined): string | null {
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

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function normalizeClientBuildConfig(config: ClientExportBuildConfig): ClientExportBuildConfig {
  return {
    basePath: normalizeBasePath(config.basePath),
    domain: normalizeDomain(config.domain) || DEFAULT_DOMAIN,
  };
}

function assertContentPayload(content: unknown): void {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new ClientExportError(400, 'Conteúdo inválido para exportação.');
  }

  try {
    JSON.stringify(content);
  } catch {
    throw new ClientExportError(400, 'Conteúdo inválido para exportação.');
  }
}

function normalizeExportsBucket(rawBucket?: string): string {
  const trimmed = rawBucket?.trim();
  return trimmed || DEFAULT_EXPORTS_BUCKET;
}

function normalizeExportClientZipParams(params: ExportClientZipParams): NormalizedExportClientZipParams {
  const clientId = parseClientIdOrThrow(params.clientIdRaw);
  assertContentPayload(params.content);
  return {
    clientId,
    content: params.content,
    buildConfig: normalizeClientBuildConfig(params.buildConfig),
    supabaseClient: params.supabaseClient ?? null,
    exportsBucket: normalizeExportsBucket(params.exportsBucket),
  };
}

function isTextFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  if (TEXT_FILE_BASENAMES.has(basename)) {
    return true;
  }
  return TEXT_FILE_EXTENSIONS.has(extension);
}

function applyReplacers(input: string, replacers: Array<{ from: string; to: string }>): string {
  let output = input;
  for (const replacer of replacers) {
    if (!replacer.from) {
      continue;
    }
    output = output.split(replacer.from).join(replacer.to);
  }
  return output;
}

function buildDownloadUrl(clientId: ProjectId, fileName: string): string {
  return `/api/clients/${encodeURIComponent(clientId)}/exports/${encodeURIComponent(fileName)}/download`;
}

function buildRobotsContent(sitemapUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

function buildSitemapContent(siteRootUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteRootUrl}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;
}

function resolveSiteRootUrl(buildConfig: ClientExportBuildConfig): string {
  const domain = normalizeDomain(buildConfig.domain) || DEFAULT_DOMAIN;
  const basePath = normalizeBasePath(buildConfig.basePath);
  if (basePath === '/') {
    return `${domain}/`;
  }
  return `${domain}${basePath}`;
}

export async function ensureTemplateExists(): Promise<void> {
  const checks = [TEMPLATE_ROOT, TEMPLATE_SITE_ROOT, TEMPLATE_METADATA_PATH];
  for (const checkedPath of checks) {
    try {
      await fs.access(checkedPath);
    } catch {
      throw new ClientExportError(
        500,
        `Template de exportação não encontrado. Execute "npm run build:export-template".`,
      );
    }
  }
}

export async function readTemplateMetadata(): Promise<{ basePathPlaceholder: string }> {
  try {
    const raw = await fs.readFile(TEMPLATE_METADATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as TemplateMetadata;
    const placeholder =
      typeof parsed?.basePathPlaceholder === 'string' ? parsed.basePathPlaceholder.trim() : '';
    if (!placeholder) {
      throw new Error('basePathPlaceholder ausente');
    }
    return { basePathPlaceholder: placeholder };
  } catch (error) {
    throw new ClientExportError(500, 'metadata.json do template de exportação está inválido.', {
      cause: error instanceof Error ? error.message : 'parse_failed',
    });
  }
}

export async function replaceTextFilesRecursively(
  rootDir: string,
  replacers: Array<{ from: string; to: string }>,
): Promise<void> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await replaceTextFilesRecursively(entryPath, replacers);
      continue;
    }
    if (!entry.isFile() || !isTextFile(entryPath)) {
      continue;
    }

    const original = await fs.readFile(entryPath, 'utf-8');
    const replaced = applyReplacers(original, replacers);
    if (replaced !== original) {
      await fs.writeFile(entryPath, replaced, 'utf-8');
    }
  }
}

export async function writeSeoArtifacts(
  siteRoot: string,
  config: ClientExportBuildConfig,
): Promise<void> {
  const siteRootUrl = resolveSiteRootUrl(config);
  const sitemapUrl = `${siteRootUrl}sitemap.xml`;
  await fs.writeFile(path.join(siteRoot, 'robots.txt'), buildRobotsContent(sitemapUrl), 'utf-8');
  await fs.writeFile(path.join(siteRoot, 'sitemap.xml'), buildSitemapContent(siteRootUrl), 'utf-8');
}

export async function createZipFromDirectory(sourceDir: string, outputZipPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputZipPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', reject);

    archive.on('warning', (error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return;
        }
      }
      reject(error);
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}

export async function uploadZipToSupabase(params: {
  supabaseClient: SupabaseClient;
  exportsBucket: string;
  clientId: ProjectId;
  fileName: string;
  absoluteZipPath: string;
}): Promise<SupabaseUploadResult> {
  const storagePath = `clients/${params.clientId}/${params.fileName}`;
  const zipBuffer = await fs.readFile(params.absoluteZipPath);
  const { error } = await params.supabaseClient.storage
    .from(params.exportsBucket)
    .upload(storagePath, zipBuffer, {
      upsert: true,
      contentType: 'application/zip',
      cacheControl: '3600',
    });

  if (error) {
    throw new ClientExportError(500, 'Falha ao enviar ZIP para Supabase Storage.', {
      cause: error.message,
      storagePath,
    });
  }

  const signed = await params.supabaseClient.storage
    .from(params.exportsBucket)
    .createSignedUrl(storagePath, 60 * 10);

  return {
    storagePath,
    downloadUrl: signed.error ? undefined : signed.data?.signedUrl,
  };
}

async function writeClientContent(siteRoot: string, content: unknown): Promise<void> {
  assertContentPayload(content);
  const outputPath = path.join(siteRoot, 'content', 'content.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(content, null, 2)}\n`, 'utf-8');
}

export async function exportClientZip(
  params: ExportClientZipParams,
): Promise<ExportClientZipResult> {
  // Fluxo de export atual: overlay + ZIP a partir do template prebuildado, sem build por cliente.
  const normalizedParams = normalizeExportClientZipParams(params);
  await ensureTemplateExists();
  const metadata = await readTemplateMetadata();

  const timestamp = formatTimestamp(new Date());
  const fileName = `${normalizedParams.clientId}-${timestamp}.zip`;
  const clientArtifactsRoot = path.join(ARTIFACTS_ROOT, normalizedParams.clientId);
  const buildPath = path.join(clientArtifactsRoot, 'build', timestamp);
  const zipDirectoryPath = path.join(clientArtifactsRoot, 'zip');

  await fs.mkdir(TEMP_WORKSPACES_ROOT, { recursive: true });
  const temporaryWorkspace = await fs.mkdtemp(
    path.join(TEMP_WORKSPACES_ROOT, `${normalizedParams.clientId}-`),
  );
  const siteRoot = path.join(temporaryWorkspace, 'site');
  const temporaryZipPath = path.join(temporaryWorkspace, fileName);

  try {
    await fs.cp(TEMPLATE_SITE_ROOT, siteRoot, { recursive: true });
    await replaceTextFilesRecursively(siteRoot, [
      {
        from: metadata.basePathPlaceholder,
        to: normalizedParams.buildConfig.basePath,
      },
    ]);

    await writeClientContent(siteRoot, normalizedParams.content);
    await writeSeoArtifacts(siteRoot, normalizedParams.buildConfig);
    await createZipFromDirectory(siteRoot, temporaryZipPath);

    await fs.mkdir(path.dirname(buildPath), { recursive: true });
    await fs.rm(buildPath, { recursive: true, force: true });
    await fs.cp(siteRoot, buildPath, { recursive: true });

    await fs.mkdir(zipDirectoryPath, { recursive: true });
    const absoluteZipPath = path.join(zipDirectoryPath, fileName);
    await fs.copyFile(temporaryZipPath, absoluteZipPath);
    const stat = await fs.stat(absoluteZipPath);

    let storagePath: string | undefined;
    let signedDownloadUrl: string | undefined;
    if (normalizedParams.supabaseClient) {
      const uploadResult = await uploadZipToSupabase({
        supabaseClient: normalizedParams.supabaseClient,
        exportsBucket: normalizedParams.exportsBucket,
        clientId: normalizedParams.clientId,
        fileName,
        absoluteZipPath,
      });
      storagePath = uploadResult.storagePath;
      signedDownloadUrl = uploadResult.downloadUrl;
    }

    return {
      clientId: normalizedParams.clientId,
      buildPath,
      buildConfig: normalizedParams.buildConfig,
      zip: {
        clientId: normalizedParams.clientId,
        fileName,
        absolutePath: absoluteZipPath,
        storagePath,
        sizeInBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        downloadUrl: signedDownloadUrl,
      },
    };
  } catch (error) {
    if (error instanceof ClientExportError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Falha ao gerar ZIP do cliente.';
    throw new ClientExportError(500, message);
  } finally {
    await fs.rm(temporaryWorkspace, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function listClientExports(clientIdRaw: string): Promise<ClientExportZipArtifact[]> {
  const clientId = parseClientIdOrThrow(clientIdRaw);
  const zipDirectoryPath = path.join(ARTIFACTS_ROOT, clientId, 'zip');

  let entries: string[];
  try {
    entries = await fs.readdir(zipDirectoryPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return [];
      }
    }
    throw error;
  }

  const artifacts = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.zip'))
      .map(async (fileName) => {
        const absolutePath = path.join(zipDirectoryPath, fileName);
        const stat = await fs.stat(absolutePath);
        return {
          clientId,
          fileName,
          absolutePath,
          sizeInBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
        } satisfies ClientExportZipArtifact;
      }),
  );

  return artifacts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLatestClientExport(clientIdRaw: string): Promise<ClientExportZipArtifact | null> {
  const items = await listClientExports(clientIdRaw);
  return items[0] ?? null;
}

export async function getClientExportByFileName(
  clientIdRaw: string,
  fileNameRaw: string,
): Promise<ClientExportZipArtifact> {
  const clientId = parseClientIdOrThrow(clientIdRaw);
  const fileName = path.basename(fileNameRaw);
  if (fileName !== fileNameRaw || !fileName.endsWith('.zip')) {
    throw new ClientExportError(400, 'Nome de arquivo de exportação inválido.');
  }

  const absolutePath = path.join(ARTIFACTS_ROOT, clientId, 'zip', fileName);
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) {
      throw new ClientExportError(404, 'Artefato de exportação não encontrado.');
    }
    return {
      clientId,
      fileName,
      absolutePath,
      sizeInBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  } catch (error) {
    if (error instanceof ClientExportError) {
      throw error;
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new ClientExportError(404, 'Artefato de exportação não encontrado.');
      }
    }
    throw error;
  }
}

export function enrichClientExportWithDownloadUrl(artifact: ClientExportZipArtifactLike) {
  return {
    ...artifact,
    downloadUrl: artifact.downloadUrl || buildDownloadUrl(artifact.clientId, artifact.fileName),
  };
}
