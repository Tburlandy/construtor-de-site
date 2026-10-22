import type { StudioLayoutRecord } from '../contracts/studioLayouts.js';

export interface LayoutRepository {
  list(): Promise<StudioLayoutRecord[]>;
  getByLayoutId(layoutId: string): Promise<StudioLayoutRecord | null>;
}

type LegacyBaseTemplateRepository = {
  getByTemplateKey(templateKey: string): Promise<{ styleId: string; schemaVersion?: string; content: unknown; updatedAt: string } | null>;
  ensureDefaultStyle1Exists(): Promise<{ styleId: string; schemaVersion?: string; content: unknown; updatedAt: string }>;
};

function toLayout(record: { styleId: string; schemaVersion?: string; content: unknown; updatedAt: string }): StudioLayoutRecord {
  return {
    layoutId: record.styleId,
    name: record.styleId === 'style-1' ? 'Style 1' : record.styleId,
    description: record.styleId === 'style-1' ? 'Layout legado principal' : '',
    rendererKey: record.styleId,
    schemaVersion: record.schemaVersion,
    defaultContent: record.content as Record<string, unknown>,
    manifest: { category: 'landing-page' },
    status: 'active',
    createdAt: record.updatedAt,
    updatedAt: record.updatedAt,
  };
}

export function createLegacyLayoutRepositoryAdapter(base: LegacyBaseTemplateRepository): LayoutRepository {
  return {
    async list() {
      const style1 = (await base.getByTemplateKey('style-1')) ?? (await base.ensureDefaultStyle1Exists());
      return [toLayout(style1)];
    },
    async getByLayoutId(layoutId) {
      const record = await base.getByTemplateKey(layoutId);
      if (record) return toLayout(record);
      if (layoutId === 'style-1') return toLayout(await base.ensureDefaultStyle1Exists());
      return null;
    },
  };
}
