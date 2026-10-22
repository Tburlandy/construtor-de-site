import type { StudioLayoutRecord } from '../contracts/studioLayouts.js';

export interface LayoutRepository {
  list(): Promise<StudioLayoutRecord[]>;
  getByLayoutId(layoutId: string): Promise<StudioLayoutRecord | null>;
}

type LegacyBaseTemplateRecord = {
  styleId?: string;
  schemaVersion?: string;
  content?: unknown;
  updatedAt?: string;
};

type LegacyBaseTemplateRepository = {
  getByTemplateKey(templateKey: string): Promise<LegacyBaseTemplateRecord | null>;
  ensureDefaultStyle1Exists(): Promise<LegacyBaseTemplateRecord>;
};

function toLayout(record: LegacyBaseTemplateRecord): StudioLayoutRecord {
  if (typeof record.styleId !== 'string' || record.styleId.length === 0) {
    throw new Error('Layout base template is missing styleId');
  }
  if (typeof record.updatedAt !== 'string' || record.updatedAt.length === 0) {
    throw new Error('Layout base template is missing updatedAt');
  }
  if (record.content == null || typeof record.content !== 'object' || Array.isArray(record.content)) {
    throw new Error('Layout base template has invalid content');
  }

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
