import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';

import { ProjectSchema, type ProjectId } from '../contracts/index.js';
import {
  StudioClientTemplateStateRecordSchema,
  type StudioClientTemplateStateRecord,
} from '../contracts/studioTemplateInheritance.js';

const TEMPLATE_STATE_FILENAME = 'template-state.json';
const DEFAULT_PROJECTS_ROOT_DIR = path.resolve('data', 'projects');

export interface StudioClientTemplateStateRepository {
  getByProjectId(projectId: ProjectId): Promise<StudioClientTemplateStateRecord | null>;
  save(record: StudioClientTemplateStateRecord): Promise<StudioClientTemplateStateRecord>;
  /** Remove apenas `template-state.json`; diretório do projeto permanece. Idempotente se o arquivo não existir. */
  deleteByProjectId(projectId: ProjectId): Promise<void>;
  /** Lista estados de todos os projetos que possuem `template-state.json` válido. */
  listAll(): Promise<StudioClientTemplateStateRecord[]>;
}

export type CreateStudioClientTemplateStateRepositoryParams = {
  projectsRootDir?: string;
};

export function createStudioClientTemplateStateRepository(
  params: CreateStudioClientTemplateStateRepositoryParams = {},
): StudioClientTemplateStateRepository {
  const projectsRootDir = params.projectsRootDir ?? DEFAULT_PROJECTS_ROOT_DIR;

  const parseProjectId = (projectId: string): ProjectId =>
    ProjectSchema.parse({ projectId }).projectId;

  const getProjectDirectoryPath = (projectId: ProjectId) => path.join(projectsRootDir, projectId);
  const getTemplateStateFilePath = (projectId: ProjectId) =>
    path.join(getProjectDirectoryPath(projectId), TEMPLATE_STATE_FILENAME);

  const getByProjectId = async (
    projectId: ProjectId,
  ): Promise<StudioClientTemplateStateRecord | null> => {
    const filePath = getTemplateStateFilePath(parseProjectId(projectId));

    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    return StudioClientTemplateStateRecordSchema.parse(JSON.parse(fileContent));
  };

  const save = async (
    record: StudioClientTemplateStateRecord,
  ): Promise<StudioClientTemplateStateRecord> => {
    const validated = StudioClientTemplateStateRecordSchema.parse(record);
    const projectDirectoryPath = getProjectDirectoryPath(validated.projectId);

    await fs.mkdir(projectDirectoryPath, { recursive: true });
    await fs.writeFile(
      getTemplateStateFilePath(validated.projectId),
      `${JSON.stringify(validated, null, 2)}\n`,
      'utf-8',
    );

    return validated;
  };

  const deleteByProjectId = async (projectId: ProjectId): Promise<void> => {
    const parsedProjectId = parseProjectId(projectId);
    const filePath = getTemplateStateFilePath(parsedProjectId);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  };

  const listAll = async (): Promise<StudioClientTemplateStateRecord[]> => {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(projectsRootDir, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const records = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const parsedProject = ProjectSchema.safeParse({ projectId: entry.name });
          if (!parsedProject.success) {
            return null;
          }
          const projectId = parsedProject.data.projectId;
          const record = await getByProjectId(projectId);
          if (!record) {
            return null;
          }
          if (record.projectId !== projectId) {
            return null;
          }
          return record;
        }),
    );

    return records
      .filter((r): r is StudioClientTemplateStateRecord => r !== null)
      .sort((a, b) => a.projectId.localeCompare(b.projectId));
  };

  return {
    getByProjectId,
    save,
    deleteByProjectId,
    listAll,
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
