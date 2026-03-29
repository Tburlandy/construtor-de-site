import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ProjectSchema, type ProjectId } from '../contracts';

const DEFAULT_BASE_PATH = '/pagina/';
const DEFAULT_DOMAIN = 'https://www.efitecsolar.com';
const DATA_PROJECTS_ROOT = path.resolve('data', 'projects');
const DIST_ROOT = path.resolve('dist');
const ARTIFACTS_ROOT = path.resolve('artifacts', 'clients');

type JsonLike = Record<string, unknown>;

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
  sizeInBytes: number;
  createdAt: string;
};

export type ExportClientZipResult = {
  clientId: ProjectId;
  buildPath: string;
  zip: ClientExportZipArtifact;
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
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return null;
  }
}

function maybeRecord(value: unknown): JsonLike | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as JsonLike;
}

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
    }
    throw error;
  }
}

async function resolveClientBuildBasePath(clientId: ProjectId): Promise<string> {
  const metadataPath = path.join(DATA_PROJECTS_ROOT, clientId, 'metadata.json');
  const metadata = maybeRecord(await readJsonIfExists(metadataPath));
  const slugRaw = metadata?.slug;
  const slug = typeof slugRaw === 'string' ? slugRaw.trim() : '';
  if (!slug) {
    return DEFAULT_BASE_PATH;
  }
  return normalizeBasePath(`/${slug}`);
}

function resolveDomainFromCanonical(canonical: string | undefined, siteUrl?: string): string | null {
  const canonicalTrimmed = canonical?.trim();
  if (!canonicalTrimmed) {
    return null;
  }

  try {
    return new URL(canonicalTrimmed).origin;
  } catch {
    // noop: tentamos com siteUrl abaixo.
  }

  const siteUrlNormalized = normalizeDomain(siteUrl);
  if (!siteUrlNormalized) {
    return null;
  }

  try {
    return new URL(canonicalTrimmed, siteUrlNormalized).origin;
  } catch {
    return null;
  }
}

async function resolveClientBuildDomain(clientId: ProjectId): Promise<string> {
  const envDomain = normalizeDomain(process.env.VITE_PROJECT_DOMAIN || process.env.PROJECT_DOMAIN);
  if (envDomain) {
    return envDomain;
  }

  const seoPath = path.join(DATA_PROJECTS_ROOT, clientId, 'seo.json');
  const seo = maybeRecord(await readJsonIfExists(seoPath));
  const seoCanonical = typeof seo?.canonical === 'string' ? seo.canonical : undefined;
  const seoDomain = resolveDomainFromCanonical(seoCanonical);
  if (seoDomain) {
    return seoDomain;
  }

  const contentPath = path.join(DATA_PROJECTS_ROOT, clientId, 'content.json');
  const contentRecord = maybeRecord(await readJsonIfExists(contentPath));
  const content = maybeRecord(contentRecord?.content);
  const global = maybeRecord(content?.global);
  const contentSeo = maybeRecord(content?.seo);
  const siteUrl = typeof global?.siteUrl === 'string' ? global.siteUrl : undefined;
  const contentCanonical = typeof contentSeo?.canonical === 'string' ? contentSeo.canonical : undefined;

  const domainFromSiteUrl = normalizeDomain(siteUrl);
  if (domainFromSiteUrl) {
    return domainFromSiteUrl;
  }

  const domainFromContentCanonical = resolveDomainFromCanonical(contentCanonical, siteUrl);
  if (domainFromContentCanonical) {
    return domainFromContentCanonical;
  }

  return DEFAULT_DOMAIN;
}

async function resolveBuildConfig(clientId: ProjectId): Promise<ClientExportBuildConfig> {
  const [basePath, domain] = await Promise.all([
    resolveClientBuildBasePath(clientId),
    resolveClientBuildDomain(clientId),
  ]);
  return { basePath, domain };
}

type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

async function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  const { cwd, env } = options;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          stderr.trim() || `Comando falhou (${command} ${args.join(' ')}), código de saída ${code}.`,
        ),
      );
    });
  });
}

async function copyBuildSideFiles() {
  await fs
    .copyFile(path.resolve('public', '.htaccess'), path.join(DIST_ROOT, '.htaccess'))
    .catch((error: unknown) => {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return;
      }
      throw error;
    });

  await fs.mkdir(path.join(DIST_ROOT, 'content'), { recursive: true });
  await fs.copyFile(path.resolve('content', 'content.json'), path.join(DIST_ROOT, 'content', 'content.json'));
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

async function buildClientDist(clientId: ProjectId, config: ClientExportBuildConfig) {
  const env = {
    ...process.env,
    PROJECT_ID: clientId,
    VITE_PROJECT_ID: clientId,
    PROJECT_BASE_PATH: config.basePath,
    VITE_PROJECT_BASE_PATH: config.basePath,
    PROJECT_DOMAIN: config.domain,
    VITE_PROJECT_DOMAIN: config.domain,
    VITE_STUDIO_ENABLED: 'false',
  };

  await runCommand(process.execPath, [path.resolve('node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
    env,
  });

  await copyBuildSideFiles();

  await runCommand(process.execPath, [path.resolve('scripts', 'generate-project-seo-artifacts.mjs')], {
    env,
  });
}

function buildDownloadUrl(clientId: ProjectId, fileName: string): string {
  return `/api/clients/${encodeURIComponent(clientId)}/exports/${encodeURIComponent(fileName)}/download`;
}

export async function exportClientZip(clientIdRaw: string): Promise<ExportClientZipResult> {
  const clientId = parseClientIdOrThrow(clientIdRaw);
  const buildConfig = await resolveBuildConfig(clientId);

  try {
    await buildClientDist(clientId, buildConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar build estático do cliente.';
    throw new ClientExportError(500, message);
  }

  const timestamp = formatTimestamp(new Date());
  const clientArtifactsRoot = path.join(ARTIFACTS_ROOT, clientId);
  const buildPath = path.join(clientArtifactsRoot, 'build', timestamp);
  const zipDirectoryPath = path.join(clientArtifactsRoot, 'zip');
  const fileName = `${clientId}-${timestamp}.zip`;
  const absoluteZipPath = path.join(zipDirectoryPath, fileName);

  await fs.mkdir(path.dirname(buildPath), { recursive: true });
  await fs.mkdir(zipDirectoryPath, { recursive: true });
  await fs.rm(buildPath, { recursive: true, force: true });
  await fs.cp(DIST_ROOT, buildPath, { recursive: true });

  try {
    await runCommand('zip', ['-rq', absoluteZipPath, '.'], { cwd: buildPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao compactar ZIP do cliente.';
    throw new ClientExportError(500, message);
  }

  const stat = await fs.stat(absoluteZipPath);

  return {
    clientId,
    buildPath,
    buildConfig,
    zip: {
      clientId,
      fileName,
      absolutePath: absoluteZipPath,
      sizeInBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    },
  };
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

export function enrichClientExportWithDownloadUrl(artifact: ClientExportZipArtifact) {
  return {
    ...artifact,
    downloadUrl: buildDownloadUrl(artifact.clientId, artifact.fileName),
  };
}
