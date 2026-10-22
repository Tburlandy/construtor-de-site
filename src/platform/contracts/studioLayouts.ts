import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);

export const StudioLayoutStatusSchema = z.enum(['active', 'archived']);

export const StudioLayoutRecordSchema = z.object({
  layoutId: NonEmptyString,
  name: NonEmptyString,
  description: z.string().default(''),
  rendererKey: NonEmptyString,
  schemaVersion: z.string().trim().min(1).optional(),
  defaultContent: z.record(z.string(), z.unknown()),
  manifest: z.record(z.string(), z.unknown()).default({}),
  status: StudioLayoutStatusSchema,
  createdAt: NonEmptyString,
  updatedAt: NonEmptyString,
});

export type StudioLayoutStatus = z.infer<typeof StudioLayoutStatusSchema>;
export type StudioLayoutRecord = z.infer<typeof StudioLayoutRecordSchema>;
