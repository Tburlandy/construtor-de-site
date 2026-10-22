import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);
const Identifier = NonEmptyString.regex(/^[^/\\]+$/);
const Timestamp = NonEmptyString;

export const StudioPageStatusSchema = z.enum(['draft', 'active', 'archived']);
export const RobotsDirectiveSchema = z.enum(['index,follow', 'noindex,follow']);

export const StudioPageMetadataSchema = z.object({
  pageId: Identifier,
  clientId: Identifier,
  name: NonEmptyString,
  slug: NonEmptyString,
  publicPath: NonEmptyString.refine((value) => value.startsWith('/'), 'publicPath deve começar com /'),
  layoutId: NonEmptyString,
  status: StudioPageStatusSchema,
  isDefault: z.boolean(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

export const StudioPageContentRecordSchema = z.object({
  pageId: Identifier,
  schemaVersion: z.string().trim().min(1).optional(),
  content: z.record(z.string(), z.unknown()),
  updatedAt: Timestamp,
});

export const StudioPageSeoConfigSchema = z.object({
  pageId: Identifier,
  title: z.string(),
  description: z.string(),
  canonical: z.string(),
  ogImage: z.string(),
  jsonLd: z.unknown().optional(),
  robotsDirective: RobotsDirectiveSchema.default('index,follow'),
  updatedAt: Timestamp,
});

export const StudioPageVersionRecordSchema = z.object({
  pageId: Identifier,
  versionId: Identifier,
  content: z.record(z.string(), z.unknown()),
  createdAt: Timestamp,
});

export const StudioPageLayoutStateSchema = z.object({
  pageId: Identifier,
  layoutId: NonEmptyString,
  variables: z.record(z.string(), z.string()).default({}),
  overrides: z.record(z.string(), z.unknown()).default({}),
  overridePaths: z.array(z.string()).default([]),
  schemaVersion: z.string().trim().min(1).optional(),
  updatedAt: Timestamp,
});

export type StudioPageStatus = z.infer<typeof StudioPageStatusSchema>;
export type RobotsDirective = z.infer<typeof RobotsDirectiveSchema>;
export type StudioPageMetadata = z.infer<typeof StudioPageMetadataSchema>;
export type StudioPageContentRecord = z.infer<typeof StudioPageContentRecordSchema>;
export type StudioPageSeoConfig = z.infer<typeof StudioPageSeoConfigSchema>;
export type StudioPageVersionRecord = z.infer<typeof StudioPageVersionRecordSchema>;
export type StudioPageLayoutState = z.infer<typeof StudioPageLayoutStateSchema>;
