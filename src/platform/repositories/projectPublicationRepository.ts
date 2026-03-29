import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import {
  ProjectSchema,
  PublicationRecordSchema,
  type ProjectId,
  type PublicationRecord,
} from '../contracts/index.js';

const DEFAULT_PROJECTS_ROOT_DIR = path.resolve('data', 'projects');
const PUBLICATIONS_DIRNAME = 'publications';

export interface ProjectPublicationRepository {
  listByProjectId(projectId: ProjectId): Promise<PublicationRecord[]>;
}

export type CreateProjectPublicationRepositoryParams = {
  projectsRootDir?: string;
};

export function createProjectPublicationRepository(
  params: CreateProjectPublicationRepositoryParams = {},
): ProjectPublicationRepository {
  const projectsRootDir = params.projectsRootDir ?? DEFAULT_PROJECTS_ROOT_DIR;

  const parseProjectId = (projectId: string): ProjectId =>
    ProjectSchema.parse({ projectId }).projectId;

  const getPublicationsDirectoryPath = (projectId: ProjectId) =>
    path.join(projectsRootDir, projectId, PUBLICATIONS_DIRNAME);

  const listByProjectId = async (projectId: ProjectId): Promise<PublicationRecord[]> => {
    const parsedProjectId = parseProjectId(projectId);
    const publicationsDirectoryPath = getPublicationsDirectoryPath(parsedProjectId);

    let entries: Dirent[];
    try {
      entries = await fs.readdir(publicationsDirectoryPath, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const records = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          try {
            const filePath = path.join(publicationsDirectoryPath, entry.name);
            const raw = await fs.readFile(filePath, 'utf-8');
            const parsed = PublicationRecordSchema.safeParse(JSON.parse(raw));
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
      .filter((record): record is PublicationRecord => record !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  return {
    listByProjectId,
  };
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
