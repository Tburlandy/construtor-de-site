import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import {
  ProjectMetadataSchema,
  ProjectSchema,
  type ProjectId,
  type ProjectMetadata,
} from '../contracts/index.js';

/** Arquivo de metadados por projeto — ADR: `data/projects/<project-id>/metadata.json`. */
const METADATA_FILENAME = 'metadata.json';

/**
 * Raiz padrão relativa ao `process.cwd()`.
 * Em servidores Node, prefira `projectsRootDir` absoluto (ex.: `path.join(__dirname, 'data', 'projects')`).
 */
const DEFAULT_PROJECTS_ROOT_DIR = path.resolve('data', 'projects');

/** Operações file-based de metadados de projeto (sem conteúdo do site). */
export interface ProjectMetadataRepository {
  list(): Promise<ProjectMetadata[]>;
  getByProjectId(projectId: ProjectId): Promise<ProjectMetadata | null>;
  save(metadata: ProjectMetadata): Promise<ProjectMetadata>;
  deleteByProjectId(projectId: ProjectId): Promise<void>;
}

export type CreateProjectMetadataRepositoryParams = {
  projectsRootDir?: string;
};

/**
 * Repositório MVP: lê/grava `metadata.json` sob `data/projects/<project-id>/`.
 * Valida entrada/saída com `ProjectMetadataSchema` (F1-001).
 */
export function createProjectMetadataRepository(
  params: CreateProjectMetadataRepositoryParams = {},
): ProjectMetadataRepository {
  const projectsRootDir = params.projectsRootDir ?? DEFAULT_PROJECTS_ROOT_DIR;

  const parseProjectId = (projectId: string): ProjectId =>
    ProjectSchema.parse({ projectId }).projectId;

  const getProjectDirectoryPath = (projectId: ProjectId) => path.join(projectsRootDir, projectId);
  const getMetadataFilePath = (projectId: ProjectId) =>
    path.join(getProjectDirectoryPath(projectId), METADATA_FILENAME);

  const list = async (): Promise<ProjectMetadata[]> => {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(projectsRootDir, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const metadataByProject = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const parsedProject = ProjectSchema.safeParse({ projectId: entry.name });
          if (!parsedProject.success) {
            return null;
          }
          return getByProjectId(parsedProject.data.projectId);
        }),
    );

    return metadataByProject
      .filter((metadata): metadata is ProjectMetadata => metadata !== null)
      .sort((a, b) => a.projectId.localeCompare(b.projectId));
  };

  const getByProjectId = async (projectId: ProjectId): Promise<ProjectMetadata | null> => {
    const metadataFilePath = getMetadataFilePath(parseProjectId(projectId));

    let fileContent: string;
    try {
      fileContent = await fs.readFile(metadataFilePath, 'utf-8');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    return ProjectMetadataSchema.parse(JSON.parse(fileContent));
  };

  const save = async (metadata: ProjectMetadata): Promise<ProjectMetadata> => {
    const validatedMetadata = ProjectMetadataSchema.parse(metadata);
    const projectDirectoryPath = getProjectDirectoryPath(validatedMetadata.projectId);

    await fs.mkdir(projectDirectoryPath, { recursive: true });
    await fs.writeFile(
      getMetadataFilePath(validatedMetadata.projectId),
      `${JSON.stringify(validatedMetadata, null, 2)}\n`,
      'utf-8',
    );

    return validatedMetadata;
  };

  const deleteByProjectId = async (projectId: ProjectId): Promise<void> => {
    const parsedProjectId = parseProjectId(projectId);
    const projectDirectoryPath = getProjectDirectoryPath(parsedProjectId);
    await fs.rm(projectDirectoryPath, { recursive: true, force: true });
  };

  return {
    list,
    getByProjectId,
    save,
    deleteByProjectId,
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
