import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ProjectSchema, type ProjectId } from './src/platform/contracts/index.js';
import {
  PublishConnectionPayloadSchema,
  type PublishConnectionPayload,
} from './studio-publish-service.js';

const PUBLISH_CONFIG_FILENAME = 'publish-config.json';

export const ProjectPublishConfigRecordSchema = z.object({
  projectId: ProjectSchema.shape.projectId,
  connection: PublishConnectionPayloadSchema,
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type ProjectPublishConfigRecord = z.infer<typeof ProjectPublishConfigRecordSchema>;

function getConfigFilePath(projectsRootDir: string, projectId: ProjectId): string {
  return path.join(projectsRootDir, projectId, PUBLISH_CONFIG_FILENAME);
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

export async function getProjectPublishConfig(params: {
  projectId: ProjectId;
  projectsRootDir: string;
}): Promise<ProjectPublishConfigRecord | null> {
  const filePath = getConfigFilePath(params.projectsRootDir, params.projectId);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }

  const parsed = ProjectPublishConfigRecordSchema.parse(JSON.parse(raw));
  if (parsed.projectId !== params.projectId) {
    throw new Error('Configuração de publicação inconsistente para o projeto solicitado.');
  }

  return parsed;
}

export async function saveProjectPublishConfig(params: {
  projectId: ProjectId;
  projectsRootDir: string;
  connection: PublishConnectionPayload;
}): Promise<ProjectPublishConfigRecord> {
  const validatedConnection = PublishConnectionPayloadSchema.parse(params.connection);
  const existing = await getProjectPublishConfig({
    projectId: params.projectId,
    projectsRootDir: params.projectsRootDir,
  });
  const now = new Date().toISOString();

  const record = ProjectPublishConfigRecordSchema.parse({
    projectId: params.projectId,
    connection: validatedConnection,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  const filePath = getConfigFilePath(params.projectsRootDir, params.projectId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');

  return record;
}

export async function resolvePublishConnection(params: {
  projectId: ProjectId;
  projectsRootDir: string;
  payload: unknown;
}): Promise<PublishConnectionPayload> {
  const parsedPayload = PublishConnectionPayloadSchema.safeParse(params.payload);
  if (parsedPayload.success) {
    return parsedPayload.data;
  }

  const payloadIsEmptyObject =
    params.payload == null ||
    (typeof params.payload === 'object' &&
      !Array.isArray(params.payload) &&
      Object.keys(params.payload as Record<string, unknown>).length === 0);

  if (!payloadIsEmptyObject) {
    throw parsedPayload.error;
  }

  const savedConfig = await getProjectPublishConfig({
    projectId: params.projectId,
    projectsRootDir: params.projectsRootDir,
  });

  if (!savedConfig) {
    throw new Error('Configuração de publicação não encontrada para este cliente.');
  }

  return savedConfig.connection;
}
