import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ProjectSchema,
  ProjectSeoConfigSchema,
  type ProjectId,
  type ProjectSeoConfig,
} from '../contracts';

const SEO_FILENAME = 'seo.json';
const DEFAULT_PROJECTS_ROOT_DIR = path.resolve('data', 'projects');

export interface ProjectSeoConfigRepository {
  getByProjectId(projectId: ProjectId): Promise<ProjectSeoConfig | null>;
  save(config: ProjectSeoConfig): Promise<ProjectSeoConfig>;
}

export type CreateProjectSeoConfigRepositoryParams = {
  projectsRootDir?: string;
};

export function createProjectSeoConfigRepository(
  params: CreateProjectSeoConfigRepositoryParams = {},
): ProjectSeoConfigRepository {
  const projectsRootDir = params.projectsRootDir ?? DEFAULT_PROJECTS_ROOT_DIR;

  const parseProjectId = (projectId: string): ProjectId =>
    ProjectSchema.parse({ projectId }).projectId;

  const getProjectDirectoryPath = (projectId: ProjectId) => path.join(projectsRootDir, projectId);
  const getSeoFilePath = (projectId: ProjectId) =>
    path.join(getProjectDirectoryPath(projectId), SEO_FILENAME);

  const getByProjectId = async (projectId: ProjectId): Promise<ProjectSeoConfig | null> => {
    const seoFilePath = getSeoFilePath(parseProjectId(projectId));

    let fileContent: string;
    try {
      fileContent = await fs.readFile(seoFilePath, 'utf-8');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    return ProjectSeoConfigSchema.parse(JSON.parse(fileContent));
  };

  const save = async (config: ProjectSeoConfig): Promise<ProjectSeoConfig> => {
    const validatedConfig = ProjectSeoConfigSchema.parse(config);
    const projectDirectoryPath = getProjectDirectoryPath(validatedConfig.projectId);

    await fs.mkdir(projectDirectoryPath, { recursive: true });
    await fs.writeFile(
      getSeoFilePath(validatedConfig.projectId),
      `${JSON.stringify(validatedConfig, null, 2)}\n`,
      'utf-8',
    );

    return validatedConfig;
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
