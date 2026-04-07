import { z } from 'zod';

import { ContentSchema } from '../../content/schema.js';

/**
 * Contratos da herança de template central (Estilo 1) no Studio.
 * Não importar `./index` aqui: evita dependência circular com reexports do barrel.
 */

const NonEmptyStringSchema = z.string().trim().min(1);
const ProjectIdSchema = NonEmptyStringSchema.regex(/^[^/\\]+$/);
const TimestampSchema = NonEmptyStringSchema;

/**
 * JSON serializável para valores de override (alinhado a `JsonValue` em `index.ts`;
 * nome próprio para não colidir com o export do barrel).
 */
export type StudioTemplateOverrideValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: StudioTemplateOverrideValue }
  | StudioTemplateOverrideValue[];

export const StudioTemplateOverrideValueSchema: z.ZodType<StudioTemplateOverrideValue> = z.lazy(
  () =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(StudioTemplateOverrideValueSchema),
      z.record(z.string(), StudioTemplateOverrideValueSchema),
    ]),
);

/** Path lógico no Content (ex.: `global.brand`, `hero.stats`). */
export const StudioTemplateContentPathSchema = NonEmptyStringSchema;
export type StudioTemplateContentPath = z.infer<typeof StudioTemplateContentPathSchema>;

/**
 * Chaves mínimas de variáveis da V1 (interpolação no template central).
 * Outras chaves podem existir no mapa como strings livres.
 */
export const STUDIO_TEMPLATE_VARIABLE_KEYS_V1 = [
  'brand',
  'city',
  'siteUrl',
  'whatsappE164',
  'yearsInMarket',
  'projectCount',
] as const;

export type StudioTemplateVariableKeyV1 = (typeof STUDIO_TEMPLATE_VARIABLE_KEYS_V1)[number];

export const StudioTemplateVariableKeyV1Schema = z.enum(STUDIO_TEMPLATE_VARIABLE_KEYS_V1);

/** Mapa nome → valor string usado na interpolação do template. */
export const StudioTemplateVariableMapSchema = z.record(z.string(), z.string());
export type StudioTemplateVariableMap = z.infer<typeof StudioTemplateVariableMapSchema>;

/**
 * Registro do template central persistido (ex.: `data/studio/base-templates/style-1.json`
 * ou linha em `studio_base_templates`).
 */
export const StudioBaseTemplateRecordSchema = z.object({
  styleId: NonEmptyStringSchema,
  schemaVersion: NonEmptyStringSchema.optional(),
  content: ContentSchema,
  updatedAt: TimestampSchema,
  createdAt: TimestampSchema.optional(),
});
export type StudioBaseTemplateRecord = z.infer<typeof StudioBaseTemplateRecordSchema>;

/**
 * Estado de herança/overrides por projeto (ex.: `template-state.json`).
 */
export const StudioClientTemplateStateRecordSchema = z.object({
  projectId: ProjectIdSchema,
  styleId: NonEmptyStringSchema,
  variables: StudioTemplateVariableMapSchema.default({}),
  /** Valor efetivo armazenado por path de override (campos simples ou blocos compostos inteiros na V1). */
  overrides: z.record(z.string(), StudioTemplateOverrideValueSchema).default({}),
  /** Lista explícita de paths com override ativo (UX e auditoria). */
  overriddenPaths: z.array(StudioTemplateContentPathSchema).default([]),
  schemaVersion: NonEmptyStringSchema.optional(),
  updatedAt: TimestampSchema,
});
export type StudioClientTemplateStateRecord = z.infer<
  typeof StudioClientTemplateStateRecordSchema
>;

/**
 * Resumo de divergência em um path específico (visão da central).
 */
export const StudioFieldDivergenceSummarySchema = z.object({
  path: StudioTemplateContentPathSchema,
  divergentClientCount: z.number().int().nonnegative(),
  divergentProjectIds: z.array(ProjectIdSchema).optional(),
});
export type StudioFieldDivergenceSummary = z.infer<typeof StudioFieldDivergenceSummarySchema>;

/**
 * Resumo de divergência agregado por seção lógica da landing.
 */
export const StudioSectionDivergenceSummarySchema = z.object({
  sectionId: NonEmptyStringSchema,
  divergentClientCount: z.number().int().nonnegative(),
  divergentFieldCount: z.number().int().nonnegative().optional(),
  divergentFieldPaths: z.array(StudioTemplateContentPathSchema).optional(),
});
export type StudioSectionDivergenceSummary = z.infer<
  typeof StudioSectionDivergenceSummarySchema
>;
