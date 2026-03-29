import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  ProjectSchema,
  ProjectVersionRecordSchema,
  type JsonValue,
  type ProjectId,
  type ProjectVersionRecord,
} from '../contracts/index.js';

const DEFAULT_PROJECTS_ROOT_DIR = path.resolve('data', 'projects');
const VERSIONS_DIRNAME = 'versions';
const VERSION_FILE_EXTENSION = '.json';
const VersionIdSchema = z.string().trim().min(1).regex(/^[^/\\]+$/);

export interface ProjectVersionRepository {
  listByProjectId(projectId: ProjectId): Promise<ProjectVersionRecord[]>;
  getByProjectIdAndVersionId(
    projectId: ProjectId,
    versionId: string,
  ): Promise<ProjectVersionRecord | null>;
  createSnapshot(params: {
    projectId: ProjectId;
    content: Record<string, JsonValue>;
    versionId?: string;
    createdAt?: string;
  }): Promise<ProjectVersionRecord>;
}

export type CreateProjectVersionRepositoryParams = {
  projectsRootDir?: string;
};

export function createProjectVersionRepository(
  params: CreateProjectVersionRepositoryParams = {},
): ProjectVersionRepository {
  const projectsRootDir = params.projectsRootDir ?? DEFAULT_PROJECTS_ROOT_DIR;

  const parseProjectId = (projectId: string): ProjectId =>
    ProjectSchema.parse({ projectId }).projectId;

  const parseVersionId = (versionId: string): string =>
    VersionIdSchema.parse(versionId);

  const getVersionsDirectoryPath = (projectId: ProjectId) =>
    path.join(projectsRootDir, projectId, VERSIONS_DIRNAME);

  const getVersionFilePath = (projectId: ProjectId, versionId: string) =>
    path.join(
      getVersionsDirectoryPath(projectId),
      `${parseVersionId(versionId)}${VERSION_FILE_EXTENSION}`,
    );

  const listByProjectId = async (
    projectId: ProjectId,
  ): Promise<ProjectVersionRecord[]> => {
    const parsedProjectId = parseProjectId(projectId);
    const versionsDirectoryPath = getVersionsDirectoryPath(parsedProjectId);

    let entries: Dirent[];
    try {
      entries = await fs.readdir(versionsDirectoryPath, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const records = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(VERSION_FILE_EXTENSION))
        .map(async (entry) => {
          try {
            const filePath = path.join(versionsDirectoryPath, entry.name);
            const raw = await fs.readFile(filePath, 'utf-8');
            const parsed = ProjectVersionRecordSchema.safeParse(JSON.parse(raw));
            if (!parsed.success || parsed.data.projectId !== parsedProjectId) {
              return null;
            }
            return parsed.data;
          } catch {
            return null;
          }
        }),
    );

    return records
      .filter((record): record is ProjectVersionRecord => record !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const getByProjectIdAndVersionId = async (
    projectId: ProjectId,
    versionId: string,
  ): Promise<ProjectVersionRecord | null> => {
    const parsedProjectId = parseProjectId(projectId);
    const parsedVersionId = parseVersionId(versionId);
    const filePath = getVersionFilePath(parsedProjectId, parsedVersionId);

    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    const parsedRecord = ProjectVersionRecordSchema.parse(JSON.parse(raw));
    if (parsedRecord.projectId !== parsedProjectId) {
      return null;
    }
    return parsedRecord;
  };

  const createSnapshot = async (params: {
    projectId: ProjectId;
    content: Record<string, JsonValue>;
    versionId?: string;
    createdAt?: string;
  }): Promise<ProjectVersionRecord> => {
    const parsedProjectId = parseProjectId(params.projectId);
    const nextVersionId = params.versionId?.trim() || buildVersionId();
    const record = ProjectVersionRecordSchema.parse({
      versionId: nextVersionId,
      projectId: parsedProjectId,
      content: params.content,
      createdAt: params.createdAt ?? new Date().toISOString(),
    });
    const versionsDirectoryPath = getVersionsDirectoryPath(parsedProjectId);
    await fs.mkdir(versionsDirectoryPath, { recursive: true });
    await fs.writeFile(
      getVersionFilePath(parsedProjectId, record.versionId),
      `${JSON.stringify(record, null, 2)}\n`,
      'utf-8',
    );
    return record;
  };

  return {
    listByProjectId,
    getByProjectIdAndVersionId,
    createSnapshot,
  };
}

function buildVersionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
