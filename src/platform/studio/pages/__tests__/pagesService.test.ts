import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ContentSchema, type Content } from '@/content/schema';
import type { ProjectContentRecord } from '@/platform/contracts';
import type { StudioLayoutRecord } from '@/platform/contracts/studioLayouts';
import type {
  StudioPageContentRecord,
  StudioPageLayoutState,
  StudioPageMetadata,
  StudioPageSeoConfig,
  StudioPageVersionRecord,
} from '@/platform/contracts/studioPages';
import { createPagesService, PageDomainError } from '../pagesService';

const TS = '2026-01-01T00:00:00.000Z';
const BASE_CONTENT: Content = ContentSchema.parse(
  JSON.parse(fs.readFileSync(new URL('../../../../../content/content.json', import.meta.url), 'utf8')),
);

function createHarness() {
  const pages = new Map<string, StudioPageMetadata>();
  const contents = new Map<string, StudioPageContentRecord>();
  const seo = new Map<string, StudioPageSeoConfig>();
  const states = new Map<string, StudioPageLayoutState>();
  const versions = new Map<string, StudioPageVersionRecord[]>();
  const projectContents = new Map<string, ProjectContentRecord>([
    ['client-a', { projectId: 'client-a', schemaVersion: '1', content: BASE_CONTENT, updatedAt: TS }],
    ['client-b', { projectId: 'client-b', schemaVersion: '1', content: BASE_CONTENT, updatedAt: TS }],
  ]);
  const legacySnapshots: unknown[] = [];

  const style1: StudioLayoutRecord = {
    layoutId: 'style-1',
    name: 'Style 1',
    description: '',
    rendererKey: 'style-1',
    schemaVersion: '1',
    defaultContent: BASE_CONTENT as unknown as Record<string, unknown>,
    manifest: {},
    status: 'active',
    createdAt: TS,
    updatedAt: TS,
  };
  const style2: StudioLayoutRecord = {
    ...style1,
    layoutId: 'style-2',
    name: 'Style 2',
    defaultContent: {
      ...BASE_CONTENT,
      hero: { ...BASE_CONTENT.hero, headline: 'Novo layout' },
    } as unknown as Record<string, unknown>,
  };
  const layouts = new Map([[style1.layoutId, style1], [style2.layoutId, style2]]);

  const service = createPagesService({
    pageMetadataRepository: {
      async listByClientId(clientId) {
        return [...pages.values()].filter((page) => page.clientId === clientId);
      },
      async getByPageId(pageId) { return pages.get(pageId) ?? null; },
      async save(page) { pages.set(page.pageId, page); return page; },
      async setDefault(clientId, pageId) {
        for (const [id, page] of pages) {
          if (page.clientId === clientId) pages.set(id, { ...page, isDefault: id === pageId });
        }
      },
    },
    pageContentRepository: {
      async getByPageId(_clientId, pageId) { return contents.get(pageId) ?? null; },
      async save(_clientId, record) { contents.set(record.pageId, record); return record; },
    },
    pageSeoRepository: {
      async getByPageId(_clientId, pageId) { return seo.get(pageId) ?? null; },
      async save(_clientId, record) { seo.set(record.pageId, record); return record; },
    },
    pageVersionRepository: {
      async listByPageId(_clientId, pageId) { return versions.get(pageId) ?? []; },
      async getByPageIdAndVersionId(_clientId, pageId, versionId) {
        return (versions.get(pageId) ?? []).find((item) => item.versionId === versionId) ?? null;
      },
      async createSnapshot(_clientId, input) {
        const record: StudioPageVersionRecord = {
          pageId: input.pageId,
          versionId: input.versionId ?? `v-${(versions.get(input.pageId)?.length ?? 0) + 1}`,
          content: input.content,
          createdAt: input.createdAt ?? TS,
        };
        versions.set(input.pageId, [...(versions.get(input.pageId) ?? []), record]);
        return record;
      },
    },
    pageLayoutStateRepository: {
      async getByPageIdAndLayoutId(_clientId, pageId, layoutId) {
        const state = states.get(pageId);
        return state?.layoutId === layoutId ? state : null;
      },
      async save(_clientId, state) { states.set(state.pageId, state); return state; },
    },
    layoutRepository: {
      async list() { return [...layouts.values()]; },
      async getByLayoutId(layoutId) { return layouts.get(layoutId) ?? null; },
    },
    projectMetadataRepository: {
      async list() {
        return ['client-a', 'client-b'].map((projectId) => ({
          projectId, name: projectId, description: '', status: 'active', createdAt: TS, updatedAt: TS,
        })) as never;
      },
      async getByProjectId(projectId) {
        return ['client-a', 'client-b'].includes(projectId)
          ? ({ projectId, name: projectId, description: '', status: 'active', createdAt: TS, updatedAt: TS } as never)
          : null;
      },
      async save(value) { return value; },
    } as never,
    projectContentRepository: {
      async getByProjectId(projectId) { return projectContents.get(projectId) ?? null; },
      async save(value) { projectContents.set(value.projectId, value); return value; },
    },
    projectSeoConfigRepository: {
      async getByProjectId() { return null; },
      async save(value) { return value; },
    },
    projectVersionRepository: {
      async listByProjectId() { return []; },
      async getByProjectIdAndVersionId() { return null; },
      async createSnapshot(input) {
        legacySnapshots.push(input);
        return { versionId: `legacy-${legacySnapshots.length}`, projectId: input.projectId, content: input.content, createdAt: TS } as never;
      },
    },
    studioClientTemplateStateRepository: {
      async getByProjectId() { return null; },
      async save(value) { return value; },
    } as never,
  });

  return { service, pages, contents, seo, versions, legacySnapshots };
}

describe('pages service', () => {
  it('enforces ownership and unique public paths', async () => {
    const { service } = createHarness();
    const page = await service.createPage({
      clientId: 'client-a',
      name: 'Fale Conosco 2',
      layoutId: 'style-1',
      publicPath: '/fale-conosco-2',
    });

    await expect(service.assertPageBelongsToClient('client-b', page.pageId)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      service.createPage({
        clientId: 'client-a',
        name: 'Outra',
        layoutId: 'style-1',
        publicPath: '/fale-conosco-2',
      }),
    ).rejects.toBeInstanceOf(PageDomainError);
  });

  it('maintains one default page and refuses to archive it', async () => {
    const { service, pages } = createHarness();
    const first = await service.createPage({ clientId: 'client-a', name: 'A', layoutId: 'style-1', publicPath: '/a' });
    const second = await service.createPage({ clientId: 'client-a', name: 'B', layoutId: 'style-1', publicPath: '/b' });

    await service.setDefaultPage('client-a', first.pageId);
    await service.setDefaultPage('client-a', second.pageId);

    expect([...pages.values()].filter((page) => page.clientId === 'client-a' && page.isDefault)).toHaveLength(1);
    expect(pages.get(second.pageId)?.isDefault).toBe(true);
    await expect(service.archivePage('client-a', second.pageId)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('snapshots page content before a layout change', async () => {
    const { service, versions } = createHarness();
    const page = await service.createPage({ clientId: 'client-a', name: 'A', layoutId: 'style-1', publicPath: '/a' });
    const before = (versions.get(page.pageId) ?? []).length;

    await service.assignLayoutToPage('client-a', page.pageId, 'style-2');

    expect((versions.get(page.pageId) ?? []).length).toBeGreaterThan(before);
    expect((await service.assertPageBelongsToClient('client-a', page.pageId)).layoutId).toBe('style-2');
  });

  it('reports unresolved prefix instead of fabricating a value', async () => {
    const { service } = createHarness();
    const page = await service.createPage({ clientId: 'client-a', name: 'A', layoutId: 'style-1', publicPath: '/a' });
    const current = await service.getPageContent('client-a', page.pageId);
    await service.savePageContent('client-a', page.pageId, {
      ...current!.content,
      hero: { ...(current!.content.hero as Record<string, unknown>), headline: 'Projeto {{prefix}}' },
    });

    const validation = await service.validatePageVariables('client-a', page.pageId);
    expect(validation.ok).toBe(false);
    expect(validation.missing).toContain('prefix');
  });
  it('uses page SEO as the effective SEO for resolved content and export', async () => {
    const { service } = createHarness();
    const page = await service.createPage({
      clientId: 'client-a',
      name: 'SEO independente',
      layoutId: 'style-1',
      publicPath: '/seo-independente',
    });

    await service.savePageSeo('client-a', page.pageId, {
      title: 'SEO da página',
      description: 'Descrição exclusiva da página',
      canonical: 'https://cliente-a.example/seo-independente',
      ogImage: 'https://cliente-a.example/og-seo.jpg',
      jsonLd: { '@type': 'LocalBusiness', name: 'Página SEO' },
      robotsDirective: 'noindex,follow',
    });

    const resolved = await service.resolvePageContent('client-a', page.pageId) as Content;
    expect(resolved.seo.title).toBe('SEO da página');
    expect(resolved.seo.canonical).toBe('https://cliente-a.example/seo-independente');
    expect(resolved.seo.ogImage).toBe('https://cliente-a.example/og-seo.jpg');

  });

  it('keeps the dedicated page SEO record in sync when style-1 content SEO is saved', async () => {
    const { service, seo } = createHarness();
    const page = await service.createPage({
      clientId: 'client-a',
      name: 'SEO via conteúdo',
      layoutId: 'style-1',
      publicPath: '/seo-via-conteudo',
    });
    const current = await service.getPageContent('client-a', page.pageId);

    await service.savePageContent('client-a', page.pageId, {
      ...current!.content,
      seo: {
        ...(current!.content.seo as Record<string, unknown>),
        title: 'Título salvo no conteúdo',
        canonical: 'https://cliente-a.example/seo-via-conteudo',
      },
    });

    expect(seo.get(page.pageId)?.title).toBe('Título salvo no conteúdo');
    expect(seo.get(page.pageId)?.canonical).toBe('https://cliente-a.example/seo-via-conteudo');
  });

});
