import type { ZodType } from 'zod';
import { ContentSchema } from '../../../content/schema.js';

export type PageLayoutRendererDefinition = {
  layoutId: string;
  rendererKey: string;
  contentSchema: ZodType;
};

const style1Definition: PageLayoutRendererDefinition = {
  layoutId: 'style-1',
  rendererKey: 'style-1',
  contentSchema: ContentSchema,
};

export const PAGE_LAYOUT_RENDERERS: Readonly<Record<string, PageLayoutRendererDefinition>> = {
  'style-1': style1Definition,
};

export class UnsupportedLayoutRendererError extends Error {
  constructor(_rendererKey: string) {
    super('Layout não suportado nesta versão do aplicativo.');
    this.name = 'UnsupportedLayoutRendererError';
  }
}

export function getPageLayoutRenderer(rendererKey: string): PageLayoutRendererDefinition {
  const definition = PAGE_LAYOUT_RENDERERS[rendererKey];
  if (!definition) throw new UnsupportedLayoutRendererError(rendererKey);
  return definition;
}

export function validateLayoutContent(rendererKey: string, content: unknown): Record<string, unknown> {
  return getPageLayoutRenderer(rendererKey).contentSchema.parse(content) as unknown as Record<string, unknown>;
}
