import { z } from 'zod';
import {
  ProjectContentRecordSchema,
  ProjectMetadataSchema,
  ProjectSchema,
  type PublicationRecord,
  type ProjectMetadata,
} from '../contracts';
import type { ProjectContentRepository } from '../repositories/projectContentRepository';
import type { ProjectMetadataRepository } from '../repositories/projectMetadataRepository';
import type { ProjectPublicationRepository } from '../repositories/projectPublicationRepository';

const CreateProjectBodySchema = ProjectMetadataSchema.pick({
  projectId: true,
  name: true,
  slug: true,
}).extend({
  description: ProjectMetadataSchema.shape.description,
  status: ProjectMetadataSchema.shape.status.optional().default('draft'),
});

const DuplicateProjectBodySchema = z.object({
  targetProjectId: ProjectSchema.shape.projectId,
  name: ProjectMetadataSchema.shape.name.optional(),
  slug: ProjectMetadataSchema.shape.slug.optional(),
  description: ProjectMetadataSchema.shape.description,
});

export class ProjectsApiError extends Error {
  readonly statusCode: number;
  readonly payload?: Record<string, unknown>;

  constructor(statusCode: number, message: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ProjectsApiError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

/** Corpo esperado em `POST /api/projects` (timestamps são definidos no servidor). */
export type CreateProjectBody = z.input<typeof CreateProjectBodySchema>;
/** Corpo esperado em `POST /api/projects/:projectId/duplicate`. */
export type DuplicateProjectBody = z.input<typeof DuplicateProjectBodySchema>;

function buildNewProjectMetadata(body: unknown, now: string): ProjectMetadata {
  const parsed = CreateProjectBodySchema.parse(body);
  return ProjectMetadataSchema.parse({
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });
}

function parseProjectIdOrThrow(projectId: string): string {
  try {
    return ProjectSchema.parse({ projectId }).projectId;
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ProjectsApiError(400, 'projectId inválido', {
        details: err.flatten(),
      });
    }
    throw err;
  }
}

export async function listProjects(
  repo: ProjectMetadataRepository,
): Promise<ProjectMetadata[]> {
  return repo.list();
}

export async function getProjectById(
  repo: ProjectMetadataRepository,
  projectId: string,
): Promise<ProjectMetadata | null> {
  return repo.getByProjectId(parseProjectIdOrThrow(projectId));
}

export async function createProject(
  repo: ProjectMetadataRepository,
  body: unknown,
): Promise<ProjectMetadata> {
  const now = new Date().toISOString();
  let metadata: ProjectMetadata;
  try {
    metadata = buildNewProjectMetadata(body, now);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ProjectsApiError(400, 'Payload inválido', {
        details: err.flatten(),
      });
    }
    throw err;
  }

  const existing = await repo.getByProjectId(metadata.projectId);
  if (existing) {
    throw new ProjectsApiError(409, 'Já existe projeto com este id', {
      projectId: metadata.projectId,
    });
  }

  return repo.save(metadata);
}

export async function listProjectPublications(
  metadataRepo: ProjectMetadataRepository,
  publicationRepo: ProjectPublicationRepository,
  projectId: string,
): Promise<PublicationRecord[]> {
  const parsedProjectId = parseProjectIdOrThrow(projectId);
  const project = await metadataRepo.getByProjectId(parsedProjectId);
  if (!project) {
    throw new ProjectsApiError(404, 'Projeto não encontrado', { projectId: parsedProjectId });
  }

  return publicationRepo.listByProjectId(parsedProjectId);
}

export async function duplicateProject(
  metadataRepo: ProjectMetadataRepository,
  contentRepo: ProjectContentRepository,
  sourceProjectId: string,
  body: unknown,
): Promise<ProjectMetadata> {
  const parsedSourceProjectId = parseProjectIdOrThrow(sourceProjectId);
  const sourceMetadata = await metadataRepo.getByProjectId(parsedSourceProjectId);
  if (!sourceMetadata) {
    throw new ProjectsApiError(404, 'Projeto de origem não encontrado', {
      projectId: parsedSourceProjectId,
    });
  }

  let parsedBody: DuplicateProjectBody;
  try {
    parsedBody = DuplicateProjectBodySchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ProjectsApiError(400, 'Payload inválido', {
        details: err.flatten(),
      });
    }
    throw err;
  }

  const targetProjectId = parseProjectIdOrThrow(parsedBody.targetProjectId);
  if (targetProjectId === parsedSourceProjectId) {
    throw new ProjectsApiError(400, 'Projeto de destino deve ser diferente da origem', {
      projectId: parsedSourceProjectId,
    });
  }

  const existingTarget = await metadataRepo.getByProjectId(targetProjectId);
  if (existingTarget) {
    throw new ProjectsApiError(409, 'Já existe projeto com este id', {
      projectId: targetProjectId,
    });
  }

  const now = new Date().toISOString();
  const targetMetadata = ProjectMetadataSchema.parse({
    ...sourceMetadata,
    projectId: targetProjectId,
    name: parsedBody.name?.trim() || `${sourceMetadata.name} (cópia)`,
    slug: parsedBody.slug?.trim() || `${sourceMetadata.slug}-copia`,
    description:
      parsedBody.description !== undefined ? parsedBody.description : sourceMetadata.description,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });

  await metadataRepo.save(targetMetadata);

  const sourceContent = await contentRepo.getByProjectId(parsedSourceProjectId);
  if (sourceContent) {
    await contentRepo.save(
      ProjectContentRecordSchema.parse({
        ...sourceContent,
        projectId: targetProjectId,
        updatedAt: now,
      }),
    );
  }

  return targetMetadata;
}
