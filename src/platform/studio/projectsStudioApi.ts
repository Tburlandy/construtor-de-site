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
  name: true,
}).extend({
  projectId: ProjectSchema.shape.projectId.optional(),
  slug: ProjectMetadataSchema.shape.slug.optional(),
  description: ProjectMetadataSchema.shape.description,
  status: ProjectMetadataSchema.shape.status.optional().default('draft'),
});

const DuplicateProjectBodySchema = z.object({
  targetProjectId: ProjectSchema.shape.projectId,
  name: ProjectMetadataSchema.shape.name.optional(),
  description: ProjectMetadataSchema.shape.description,
});

const UpdateProjectMetadataBodySchema = z.object({
  name: ProjectMetadataSchema.shape.name,
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
/** Corpo esperado em `PUT /api/projects/:projectId`. */
export type UpdateProjectMetadataBody = z.input<typeof UpdateProjectMetadataBodySchema>;

function normalizeIdentifier(value: string, fallback = 'cliente'): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function ensureUniqueIdentifier(base: string, taken: Set<string>): string {
  const normalizedBase = normalizeIdentifier(base);
  if (!taken.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  while (taken.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }
  return `${normalizedBase}-${suffix}`;
}

function buildNewProjectMetadata(
  body: unknown,
  existingProjects: ProjectMetadata[],
  now: string,
): ProjectMetadata {
  const parsed = CreateProjectBodySchema.parse(body);
  const existingProjectIds = new Set(existingProjects.map((item) => item.projectId));
  const existingSlugs = new Set(existingProjects.map((item) => item.slug));
  const providedProjectId = parsed.projectId?.trim();
  const projectId = providedProjectId
    ? parseProjectIdOrThrow(providedProjectId)
    : ensureUniqueIdentifier(parsed.name, existingProjectIds);

  if (existingProjectIds.has(projectId)) {
    throw new ProjectsApiError(409, 'Já existe projeto com este id', {
      projectId,
    });
  }

  const slug = ensureUniqueIdentifier(parsed.slug?.trim() || parsed.name, existingSlugs);
  return ProjectMetadataSchema.parse({
    ...parsed,
    projectId,
    slug,
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
  const existingProjects = await repo.list();
  let metadata: ProjectMetadata;
  try {
    metadata = buildNewProjectMetadata(body, existingProjects, now);
  } catch (err) {
    if (err instanceof ProjectsApiError) {
      throw err;
    }
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

export async function updateProjectMetadata(
  repo: ProjectMetadataRepository,
  projectId: string,
  body: unknown,
): Promise<ProjectMetadata> {
  const parsedProjectId = parseProjectIdOrThrow(projectId);
  const current = await repo.getByProjectId(parsedProjectId);
  if (!current) {
    throw new ProjectsApiError(404, 'Projeto não encontrado', {
      projectId: parsedProjectId,
    });
  }

  let parsedBody: UpdateProjectMetadataBody;
  try {
    parsedBody = UpdateProjectMetadataBodySchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ProjectsApiError(400, 'Payload inválido', {
        details: err.flatten(),
      });
    }
    throw err;
  }

  const now = new Date().toISOString();
  const updated = ProjectMetadataSchema.parse({
    ...current,
    name: parsedBody.name.trim(),
    updatedAt: now,
  });

  return repo.save(updated);
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

  const existingProjects = await metadataRepo.list();
  const existingSlugs = new Set(existingProjects.map((item) => item.slug));
  const now = new Date().toISOString();
  const duplicatedName = parsedBody.name?.trim() || `${sourceMetadata.name} (cópia)`;
  const targetMetadata = ProjectMetadataSchema.parse({
    ...sourceMetadata,
    projectId: targetProjectId,
    name: duplicatedName,
    slug: ensureUniqueIdentifier(duplicatedName, existingSlugs),
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
