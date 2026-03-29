import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { z } from 'zod';
import type { ProjectId, PublicationRecord } from './src/platform/contracts/index.js';

const PublishProviderSchema = z.enum(['ftp', 'sftp']);

export const PublishConnectionPayloadSchema = z.object({
  provider: PublishProviderSchema,
  host: z.string().trim().min(1),
  port: z.coerce.number().int().positive().optional(),
  username: z.string().trim().min(1),
  password: z.string().optional(),
  remotePath: z.string().optional(),
  secure: z.boolean().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
  deployTargetId: z.string().trim().min(1).optional(),
  artifactDirectory: z.string().trim().min(1).optional(),
});

export type PublishConnectionPayload = z.infer<typeof PublishConnectionPayloadSchema>;

export class PublishOperationError extends Error {
  readonly publication: PublicationRecord;
  readonly causeError?: unknown;

  constructor(publication: PublicationRecord, causeError?: unknown) {
    super(publication.message ?? 'Falha na publicação remota');
    this.name = 'PublishOperationError';
    this.publication = publication;
    this.causeError = causeError;
  }
}

type ProjectPublishParams = {
  projectId: ProjectId;
  projectsRootDir: string;
  connection: PublishConnectionPayload;
};

type ProjectZipParams = {
  projectId: ProjectId;
  projectsRootDir: string;
  artifactDirectory?: string;
};

type LocalArtifactFile = {
  absolutePath: string;
  relativePath: string;
};

type ZipExportResult = {
  artifactDirectoryPath: string;
  zipFilePath: string;
  zipFileName: string;
};

const DEFAULT_ARTIFACT_FALLBACK_DIR = path.resolve('dist');
const require = createRequire(import.meta.url);

function normalizeRemotePath(remotePath?: string): string {
  const trimmed = remotePath?.trim();
  if (!trimmed) {
    return '.';
  }

  const normalized = trimmed.replace(/\\/g, '/').replace(/\/+$/g, '');
  return normalized.length > 0 ? normalized : '.';
}

function normalizePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) {
    return undefined;
  }

  return privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
}

function formatPublishError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Falha inesperada durante a publicação.';
}

function createPublicationId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `pub-${stamp}-${randomSuffix}`;
}

function createZipFilename(projectId: ProjectId): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${projectId}-${stamp}.zip`;
}

function getPublicationDirectoryPath(projectsRootDir: string, projectId: ProjectId): string {
  return path.join(projectsRootDir, projectId, 'publications');
}

function toArtifactPathForRecord(artifactDirectoryPath: string): string {
  const relative = path.relative(process.cwd(), artifactDirectoryPath);
  return relative && relative !== '.' ? relative : artifactDirectoryPath;
}

async function writePublicationRecord(
  projectsRootDir: string,
  record: PublicationRecord,
): Promise<void> {
  const publicationsDirectoryPath = getPublicationDirectoryPath(projectsRootDir, record.projectId);
  await fs.mkdir(publicationsDirectoryPath, { recursive: true });
  const filePath = path.join(publicationsDirectoryPath, `${record.publicationId}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

async function isDirectory(pathToCheck: string): Promise<boolean> {
  try {
    const stats = await fs.stat(pathToCheck);
    return stats.isDirectory();
  } catch (error) {
    if (
      error != null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

function loadOptionalDependency<T>(moduleName: string): T {
  try {
    return require(moduleName) as T;
  } catch {
    throw new Error(
      `Dependência opcional "${moduleName}" não encontrada. Instale para habilitar a publicação direta.`,
    );
  }
}

async function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
  },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
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

async function resolveArtifactDirectory(params: {
  projectId: ProjectId;
  projectsRootDir: string;
  artifactDirectory?: string;
}): Promise<string> {
  const candidatePaths = [
    params.artifactDirectory ? path.resolve(params.artifactDirectory) : null,
    path.join(params.projectsRootDir, params.projectId, 'artifacts', 'build'),
    path.resolve('artifacts', params.projectId, 'build'),
    DEFAULT_ARTIFACT_FALLBACK_DIR,
  ].filter((candidate): candidate is string => typeof candidate === 'string');

  for (const candidate of candidatePaths) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Nenhum artefato de build encontrado para publicação/exportação. Gere o build antes de continuar.',
  );
}

async function listLocalArtifactFiles(
  rootDirectoryPath: string,
  currentRelativePath = '',
): Promise<LocalArtifactFile[]> {
  const currentAbsolutePath = currentRelativePath
    ? path.join(rootDirectoryPath, currentRelativePath)
    : rootDirectoryPath;
  const entries = await fs.readdir(currentAbsolutePath, { withFileTypes: true });

  const files: LocalArtifactFile[] = [];
  for (const entry of entries) {
    const nextRelativePath = currentRelativePath
      ? path.join(currentRelativePath, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      const nestedFiles = await listLocalArtifactFiles(rootDirectoryPath, nextRelativePath);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile()) {
      files.push({
        absolutePath: path.join(rootDirectoryPath, nextRelativePath),
        relativePath: nextRelativePath.split(path.sep).join('/'),
      });
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function assertAuthRequirements(connection: PublishConnectionPayload): void {
  if (connection.provider === 'ftp' && !connection.password) {
    throw new Error('Senha é obrigatória para publicação FTP.');
  }

  if (connection.provider === 'sftp' && !connection.password && !connection.privateKey) {
    throw new Error('Para SFTP, informe senha ou chave privada.');
  }
}

async function testFtpConnection(connection: PublishConnectionPayload): Promise<void> {
  const ftpModule = loadOptionalDependency<{
    Client: new () => {
      access: (options: Record<string, unknown>) => Promise<void>;
      list: (remotePath?: string) => Promise<unknown[]>;
      close: () => void;
    };
  }>('basic-ftp');

  const client = new ftpModule.Client();
  try {
    await client.access({
      host: connection.host,
      port: connection.port ?? 21,
      user: connection.username,
      password: connection.password,
      secure: connection.secure ?? false,
    });

    const remotePath = normalizeRemotePath(connection.remotePath);
    if (remotePath === '.') {
      await client.list();
    } else {
      await client.list(remotePath);
    }
  } finally {
    client.close();
  }
}

async function testSftpConnection(connection: PublishConnectionPayload): Promise<void> {
  const sftpModule = loadOptionalDependency<{
    default: new () => {
      connect: (options: Record<string, unknown>) => Promise<void>;
      exists: (remotePath: string) => Promise<false | 'd' | '-' | 'l'>;
      list: (remotePath: string) => Promise<unknown[]>;
      end: () => Promise<void>;
    };
  }>('ssh2-sftp-client');

  const client = new sftpModule.default();
  try {
    await client.connect({
      host: connection.host,
      port: connection.port ?? 22,
      username: connection.username,
      password: connection.password,
      privateKey: normalizePrivateKey(connection.privateKey),
      passphrase: connection.passphrase,
    });

    const remotePath = normalizeRemotePath(connection.remotePath);
    if (remotePath === '.') {
      await client.list('.');
      return;
    }

    const exists = await client.exists(remotePath);
    if (!exists) {
      throw new Error(`Diretório remoto "${remotePath}" não encontrado no servidor SFTP.`);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function uploadWithFtp(
  localDirectoryPath: string,
  connection: PublishConnectionPayload,
): Promise<void> {
  const ftpModule = loadOptionalDependency<{
    Client: new () => {
      access: (options: Record<string, unknown>) => Promise<void>;
      ensureDir: (remotePath: string) => Promise<void>;
      uploadFromDir: (localDirPath: string) => Promise<void>;
      close: () => void;
    };
  }>('basic-ftp');

  const client = new ftpModule.Client();
  try {
    await client.access({
      host: connection.host,
      port: connection.port ?? 21,
      user: connection.username,
      password: connection.password,
      secure: connection.secure ?? false,
    });

    const remotePath = normalizeRemotePath(connection.remotePath);
    if (remotePath !== '.') {
      await client.ensureDir(remotePath);
    }

    await client.uploadFromDir(localDirectoryPath);
  } finally {
    client.close();
  }
}

async function uploadWithSftp(
  localDirectoryPath: string,
  connection: PublishConnectionPayload,
): Promise<void> {
  const sftpModule = loadOptionalDependency<{
    default: new () => {
      connect: (options: Record<string, unknown>) => Promise<void>;
      mkdir: (remotePath: string, recursive?: boolean) => Promise<void>;
      put: (localSource: string, remoteTarget: string) => Promise<void>;
      end: () => Promise<void>;
    };
  }>('ssh2-sftp-client');

  const client = new sftpModule.default();
  const files = await listLocalArtifactFiles(localDirectoryPath);

  try {
    await client.connect({
      host: connection.host,
      port: connection.port ?? 22,
      username: connection.username,
      password: connection.password,
      privateKey: normalizePrivateKey(connection.privateKey),
      passphrase: connection.passphrase,
    });

    const remoteBasePath = normalizeRemotePath(connection.remotePath);
    if (remoteBasePath !== '.') {
      await client.mkdir(remoteBasePath, true);
    }

    for (const file of files) {
      const remoteFilePath =
        remoteBasePath === '.'
          ? file.relativePath
          : path.posix.join(remoteBasePath, file.relativePath);
      const remoteDirectoryPath = path.posix.dirname(remoteFilePath);
      if (remoteDirectoryPath && remoteDirectoryPath !== '.') {
        await client.mkdir(remoteDirectoryPath, true);
      }
      await client.put(file.absolutePath, remoteFilePath);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function uploadArtifactDirectory(
  localDirectoryPath: string,
  connection: PublishConnectionPayload,
): Promise<void> {
  if (connection.provider === 'ftp') {
    await uploadWithFtp(localDirectoryPath, connection);
    return;
  }

  await uploadWithSftp(localDirectoryPath, connection);
}

async function createZipFromDirectory(
  sourceDirectoryPath: string,
  destinationZipPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(destinationZipPath), { recursive: true });
  await fs.rm(destinationZipPath, { force: true });
  await runCommand('zip', ['-rq', destinationZipPath, '.'], {
    cwd: sourceDirectoryPath,
  });
}

export async function createProjectZipExport(
  params: ProjectZipParams,
): Promise<ZipExportResult> {
  const artifactDirectoryPath = await resolveArtifactDirectory({
    projectId: params.projectId,
    projectsRootDir: params.projectsRootDir,
    artifactDirectory: params.artifactDirectory,
  });

  const zipFileName = createZipFilename(params.projectId);
  const zipFilePath = path.join(
    params.projectsRootDir,
    params.projectId,
    'artifacts',
    'zip',
    zipFileName,
  );

  await createZipFromDirectory(artifactDirectoryPath, zipFilePath);

  return {
    artifactDirectoryPath,
    zipFilePath,
    zipFileName,
  };
}

export async function testPublishConnection(
  connection: PublishConnectionPayload,
): Promise<void> {
  assertAuthRequirements(connection);

  if (connection.provider === 'ftp') {
    await testFtpConnection(connection);
    return;
  }

  await testSftpConnection(connection);
}

export async function publishProjectArtifact(params: ProjectPublishParams): Promise<{
  publication: PublicationRecord;
  uploadedFiles: number;
}> {
  const artifactDirectoryPath = await resolveArtifactDirectory({
    projectId: params.projectId,
    projectsRootDir: params.projectsRootDir,
    artifactDirectory: params.connection.artifactDirectory,
  });
  const localFiles = await listLocalArtifactFiles(artifactDirectoryPath);

  if (localFiles.length === 0) {
    throw new Error('O artefato de build está vazio. Gere um build antes de publicar.');
  }

  const publicationId = createPublicationId();
  const createdAt = new Date().toISOString();

  const runningRecord: PublicationRecord = {
    publicationId,
    projectId: params.projectId,
    deployTargetId: params.connection.deployTargetId,
    artifactPath: toArtifactPathForRecord(artifactDirectoryPath),
    status: 'running',
    createdAt,
    message: `Publicação iniciada via ${params.connection.provider.toUpperCase()}.`,
  };

  await writePublicationRecord(params.projectsRootDir, runningRecord);

  try {
    assertAuthRequirements(params.connection);
    await uploadArtifactDirectory(artifactDirectoryPath, params.connection);

    const successRecord: PublicationRecord = {
      ...runningRecord,
      status: 'success',
      finishedAt: new Date().toISOString(),
      message: `Publicação concluída com ${localFiles.length} arquivo(s) enviados.`,
    };

    await writePublicationRecord(params.projectsRootDir, successRecord);
    return {
      publication: successRecord,
      uploadedFiles: localFiles.length,
    };
  } catch (error) {
    const failedRecord: PublicationRecord = {
      ...runningRecord,
      status: 'failed',
      finishedAt: new Date().toISOString(),
      message: formatPublishError(error),
    };

    await writePublicationRecord(params.projectsRootDir, failedRecord).catch(() => undefined);
    throw new PublishOperationError(failedRecord, error);
  }
}
