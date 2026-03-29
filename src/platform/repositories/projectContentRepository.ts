import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ProjectContentRecordSchema,
  ProjectSchema,
  type ProjectContentRecord,
  type ProjectId,
} from '../contracts/index.js';

const CONTENT_FILENAME = 'content.json';
const DEFAULT_PROJECTS_ROOT_DIR = path.resolve('data', 'projects');

export interface ProjectContentRepository {
  getByProjectId(projectId: ProjectId): Promise<ProjectContentRecord | null>;
  save(contentRecord: ProjectContentRecord): Promise<ProjectContentRecord>;
}

export type CreateProjectContentRepositoryParams = {
  projectsRootDir?: string;
};

export function createProjectContentRepository(
  params: CreateProjectContentRepositoryParams = {},
): ProjectContentRepository {
  const projectsRootDir = params.projectsRootDir ?? DEFAULT_PROJECTS_ROOT_DIR;

  const parseProjectId = (projectId: string): ProjectId =>
    ProjectSchema.parse({ projectId }).projectId;

  const getProjectDirectoryPath = (projectId: ProjectId) => path.join(projectsRootDir, projectId);
  const getContentFilePath = (projectId: ProjectId) =>
    path.join(getProjectDirectoryPath(projectId), CONTENT_FILENAME);

  const getByProjectId = async (projectId: ProjectId): Promise<ProjectContentRecord | null> => {
    const contentFilePath = getContentFilePath(parseProjectId(projectId));

    let fileContent: string;
    try {
      fileContent = await fs.readFile(contentFilePath, 'utf-8');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    return ProjectContentRecordSchema.parse(JSON.parse(fileContent));
  };

  const save = async (contentRecord: ProjectContentRecord): Promise<ProjectContentRecord> => {
    const validatedContentRecord = ProjectContentRecordSchema.parse(contentRecord);
    const projectDirectoryPath = getProjectDirectoryPath(validatedContentRecord.projectId);

    await fs.mkdir(projectDirectoryPath, { recursive: true });
    await fs.writeFile(
      getContentFilePath(validatedContentRecord.projectId),
      `${JSON.stringify(validatedContentRecord, null, 2)}\n`,
      'utf-8',
    );

    return validatedContentRecord;
  };

  return {
    getByProjectId,
    save,
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
