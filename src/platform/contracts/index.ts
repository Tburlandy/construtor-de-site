import { z } from 'zod';

/**
 * Contratos do domínio da plataforma (multi-projeto).
 * O payload do site em `ProjectContentRecord.content` é `JsonValue`: na fronteira da app,
 * validar com `ContentSchema` de `src/content/schema.ts` sem importar esse schema aqui.
 */
const NonEmptyStringSchema = z.string().trim().min(1);
const ProjectIdSchema = NonEmptyStringSchema.regex(/^[^/\\]+$/);
const RecordIdSchema = NonEmptyStringSchema.regex(/^[^/\\]+$/);
const TimestampSchema = NonEmptyStringSchema;

export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type PlatformRecordId = z.infer<typeof RecordIdSchema>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const ProjectSchema = z.object({
  projectId: ProjectIdSchema,
});

export const ProjectMetadataSchema = ProjectSchema.extend({
  name: NonEmptyStringSchema,
  slug: NonEmptyStringSchema,
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ProjectContentRecordSchema = z.object({
  projectId: ProjectIdSchema,
  schemaVersion: NonEmptyStringSchema.optional(),
  content: z.record(z.string(), JsonValueSchema),
  updatedAt: TimestampSchema,
});

export const ProjectSeoConfigSchema = z.object({
  projectId: ProjectIdSchema,
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  canonical: NonEmptyStringSchema,
  ogImage: NonEmptyStringSchema,
  jsonLd: JsonValueSchema.optional(),
  updatedAt: TimestampSchema,
});

export const DeployTargetRecordSchema = z.object({
  deployTargetId: RecordIdSchema,
  projectId: ProjectIdSchema,
  name: NonEmptyStringSchema,
  provider: z.enum(['ftp', 'sftp', 'local']),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  remotePath: z.string().optional(),
  username: z.string().optional(),
  isDefault: z.boolean().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const PublicationRecordSchema = z.object({
  publicationId: RecordIdSchema,
  projectId: ProjectIdSchema,
  deployTargetId: RecordIdSchema.optional(),
  artifactPath: NonEmptyStringSchema,
  status: z.enum(['queued', 'running', 'success', 'failed']),
  createdAt: TimestampSchema,
  finishedAt: z.string().optional(),
  message: z.string().optional(),
});

export const ProjectVersionRecordSchema = z.object({
  versionId: RecordIdSchema,
  projectId: ProjectIdSchema,
  content: z.record(z.string(), JsonValueSchema),
  createdAt: TimestampSchema,
});

/** Visão composta opcionalmente enriquecida; `seo` pode faltar enquanto o SEO vier só de `content.json` legado. */
export const ProjectRecordSchema = z.object({
  projectId: ProjectIdSchema,
  metadata: ProjectMetadataSchema,
  content: ProjectContentRecordSchema,
  seo: ProjectSeoConfigSchema.optional(),
  deployTargets: z.array(DeployTargetRecordSchema).default([]),
  publications: z.array(PublicationRecordSchema).default([]),
});

export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type Project = z.infer<typeof ProjectSchema>;
/** Entidade base de projeto na plataforma (identidade estável). */
export type PlatformProject = Project;
export type ProjectContentRecord = z.infer<typeof ProjectContentRecordSchema>;
export type ProjectSeoConfig = z.infer<typeof ProjectSeoConfigSchema>;
export type DeployTargetRecord = z.infer<typeof DeployTargetRecordSchema>;
export type PublicationRecord = z.infer<typeof PublicationRecordSchema>;
export type ProjectVersionRecord = z.infer<typeof ProjectVersionRecordSchema>;
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;
