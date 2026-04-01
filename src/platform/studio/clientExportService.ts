import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectSchema, type ProjectId } from '../contracts/index.js';

const DEFAULT_BASE_PATH = '/pagina/';
const DEFAULT_DOMAIN = 'https://www.efitecsolar.com';
const REPO_ROOT = path.resolve('.');
const DATA_PROJECTS_ROOT = path.join(REPO_ROOT, 'data', 'projects');
const LEGACY_CONTENT_PATH = path.join(REPO_ROOT, 'content', 'content.json');
const IS_SERVERLESS_RUNTIME = Boolean(process.env.VERCEL);
const WORK_ROOT = IS_SERVERLESS_RUNTIME ? path.join(os.tmpdir(), 'studio-export-runtime') : REPO_ROOT;
const ARTIFACTS_ROOT = path.join(WORK_ROOT, 'artifacts', 'clients');

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

function normalizeGtmId(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') {
    return null;
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
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
  const envBasePath = process.env.VITE_PROJECT_BASE_PATH || process.env.PROJECT_BASE_PATH;
  if (typeof envBasePath === 'string' && envBasePath.trim()) {
    return normalizeBasePath(envBasePath);
  }

  const contentPath = path.join(DATA_PROJECTS_ROOT, clientId, 'content.json');
  const contentRecord = maybeRecord(await readJsonIfExists(contentPath));
  const content = maybeRecord(contentRecord?.content);
  const global = maybeRecord(content?.global);
  const configuredBasePath =
    typeof global?.buildBasePath === 'string' ? global.buildBasePath : undefined;
  if (configuredBasePath?.trim()) {
    return normalizeBasePath(configuredBasePath);
  }

  const legacyContent = maybeRecord(await readJsonIfExists(LEGACY_CONTENT_PATH));
  const legacyGlobal = maybeRecord(legacyContent?.global);
  const legacyConfiguredBasePath =
    typeof legacyGlobal?.buildBasePath === 'string' ? legacyGlobal.buildBasePath : undefined;
  if (legacyConfiguredBasePath?.trim()) {
    return normalizeBasePath(legacyConfiguredBasePath);
  }

  return DEFAULT_BASE_PATH;
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

async function resolveClientGtmId(clientId: ProjectId): Promise<string | null> {
  const contentPath = path.join(DATA_PROJECTS_ROOT, clientId, 'content.json');
  const contentRecord = maybeRecord(await readJsonIfExists(contentPath));
  const content = maybeRecord(contentRecord?.content);
  const global = maybeRecord(content?.global);
  const projectGtmId = normalizeGtmId(global?.gtmId);
  if (projectGtmId) {
    return projectGtmId;
  }

  const legacyContent = maybeRecord(await readJsonIfExists(LEGACY_CONTENT_PATH));
  const legacyGlobal = maybeRecord(legacyContent?.global);
  return normalizeGtmId(legacyGlobal?.gtmId);
}

async function hardcodeClientGtmIntoDistIndex(clientId: ProjectId, distRoot: string): Promise<void> {
  const gtmId = await resolveClientGtmId(clientId);
  if (!gtmId) {
    return;
  }

  const indexPath = path.join(distRoot, 'index.html');
  const rawIndexHtml = await fs.readFile(indexPath, 'utf-8');
  const withoutPreviousMarkers = rawIndexHtml
    .replace(/<!-- CLIENT ZIP GTM HEAD START -->[\s\S]*?<!-- CLIENT ZIP GTM HEAD END -->\s*/g, '')
    .replace(/<!-- CLIENT ZIP GTM BODY START -->[\s\S]*?<!-- CLIENT ZIP GTM BODY END -->\s*/g, '');

  const headInjection = [
    '    <!-- CLIENT ZIP GTM HEAD START -->',
    `    <script async src="https://www.googletagmanager.com/gtm.js?id=${gtmId}" data-gtm-id="${gtmId}"></script>`,
    '    <!-- CLIENT ZIP GTM HEAD END -->',
    '',
  ].join('\n');
  const bodyInjection = [
    '    <!-- CLIENT ZIP GTM BODY START -->',
    `    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden" data-gtm-noscript="${gtmId}"></iframe></noscript>`,
    '    <!-- CLIENT ZIP GTM BODY END -->',
    '',
  ].join('\n');

  const withHead = withoutPreviousMarkers.replace('</head>', `${headInjection}</head>`);
  const withBody = withHead.replace(/<body([^>]*)>\s*/i, `<body$1>\n${bodyInjection}`);
  await fs.writeFile(indexPath, withBody, 'utf-8');
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

async function copyBuildSideFiles(params: { workspaceRoot: string; distRoot: string }) {
  await fs
    .copyFile(path.join(params.workspaceRoot, 'public', '.htaccess'), path.join(params.distRoot, '.htaccess'))
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

  await fs.mkdir(path.join(params.distRoot, 'content'), { recursive: true });
  await fs.copyFile(
    path.join(params.workspaceRoot, 'content', 'content.json'),
    path.join(params.distRoot, 'content', 'content.json'),
  );
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

async function prepareBuildWorkspace(clientId: ProjectId): Promise<string> {
  if (!IS_SERVERLESS_RUNTIME) {
    return REPO_ROOT;
  }

  const workspaceRoot = path.join(WORK_ROOT, 'workspaces', `${clientId}-${Date.now()}`);
  await fs.mkdir(workspaceRoot, { recursive: true });

  const entriesToCopy = [
    'index.html',
    'vite.config.ts',
    'vite-plugin-studio.ts',
    'studio-publish-service.ts',
    'studio-publish-config-service.ts',
    'src',
    'public',
    'content',
    'data',
    'scripts',
    'tsconfig.app.json',
  ];

  for (const entry of entriesToCopy) {
    const sourcePath = path.join(REPO_ROOT, entry);
    const targetPath = path.join(workspaceRoot, entry);
    try {
      const stat = await fs.stat(sourcePath);
      if (stat.isDirectory()) {
        await fs.cp(sourcePath, targetPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(sourcePath, targetPath);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
      }
      throw error;
    }
  }

  await fs.symlink(path.join(REPO_ROOT, 'node_modules'), path.join(workspaceRoot, 'node_modules'), 'dir');
  return workspaceRoot;
}

async function buildClientDist(clientId: ProjectId, config: ClientExportBuildConfig): Promise<string> {
  const workspaceRoot = await prepareBuildWorkspace(clientId);
  const distRoot = path.join(workspaceRoot, 'dist');
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

  await runCommand(
    process.execPath,
    [
      path.join(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      'build',
      '--config',
      path.join(workspaceRoot, 'scripts', 'vite-export.config.mjs'),
    ],
    {
      cwd: workspaceRoot,
      env,
    },
  );

  await copyBuildSideFiles({ workspaceRoot, distRoot });

  await runCommand(process.execPath, [path.join(workspaceRoot, 'scripts', 'generate-project-seo-artifacts.mjs')], {
    cwd: workspaceRoot,
    env,
  });

  await hardcodeClientGtmIntoDistIndex(clientId, distRoot);
  return workspaceRoot;
}

function buildDownloadUrl(clientId: ProjectId, fileName: string): string {
  return `/api/clients/${encodeURIComponent(clientId)}/exports/${encodeURIComponent(fileName)}/download`;
}

export async function exportClientZip(clientIdRaw: string): Promise<ExportClientZipResult> {
  const clientId = parseClientIdOrThrow(clientIdRaw);
  const buildConfig = await resolveBuildConfig(clientId);
  let workspaceRoot = REPO_ROOT;
  let distRoot = path.join(REPO_ROOT, 'dist');

  try {
    workspaceRoot = await buildClientDist(clientId, buildConfig);
    distRoot = path.join(workspaceRoot, 'dist');
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

  try {
    await fs.mkdir(path.dirname(buildPath), { recursive: true });
    await fs.mkdir(zipDirectoryPath, { recursive: true });
    await fs.rm(buildPath, { recursive: true, force: true });
    await fs.cp(distRoot, buildPath, { recursive: true });

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
  } finally {
    if (IS_SERVERLESS_RUNTIME && workspaceRoot !== REPO_ROOT) {
      await fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
    }
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

export function enrichClientExportWithDownloadUrl(artifact: ClientExportZipArtifact) {
  return {
    ...artifact,
    downloadUrl: buildDownloadUrl(artifact.clientId, artifact.fileName),
  };
}
