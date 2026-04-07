/**
 * Prompt 22 — migração (lógica alinhada ao script) + API HTTP de herança / template central.
 * Requer repositório em ficheiro: sem SUPABASE_URL ao importar o studio-server.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import { ContentSchema, type Content } from '@/content/schema';
import { SUPPORTED_TEMPLATE_VARIABLE_KEYS, type TemplateVariableMap } from '@/lib/templateVariables';
import { STUDIO_BASE_TEMPLATE_KEY_STYLE_1 } from '@/platform/repositories/studioBaseTemplateRepository';
import { buildProjectContentRecord } from '@/platform/repositories/projectSiteContentBridge';
import { siteSeoFromProjectSeoConfig } from '@/platform/repositories/projectSeoConfigBridge';
import { createProjectContentRepository } from '@/platform/repositories/projectContentRepository';
import { createProjectSeoConfigRepository } from '@/platform/repositories/projectSeoConfigRepository';
import { createStudioClientTemplateStateRepository } from '@/platform/repositories/studioClientTemplateStateRepository';
import type { StudioBaseTemplateRecord, StudioClientTemplateStateRecord } from '@/platform/contracts/studioTemplateInheritance';
import type { ProjectSeoConfig } from '@/platform/contracts/index';
import {
  buildOverridesFromResolvedContent,
  resolveClientContent,
} from '@/platform/studio/templateInheritanceService';
import { siteContentFromRecord } from '@/platform/repositories/projectSiteContentBridge';

const TEMPLATE_STATE = 'template-state.json';

function templateContentWithPlaceholders(): Content {
  return ContentSchema.parse({
    global: {
      brand: '{{brand}}',
      city: '{{city}}',
      whatsappE164: '{{whatsappE164}}',
      cnpj: '',
      address: '',
      siteUrl: '{{siteUrl}}',
      yearsInMarket: '',
      projectCount: '',
    },
    seo: {
      title: '{{brand}} | SEO',
      description: 'Desc',
      canonical: '{{siteUrl}}/',
      ogImage: '/og.jpg',
      jsonLd: {},
    },
    hero: {
      headline: 'Linha {{brand}} na cidade {{city}}',
      subheadline: 'Sub',
      ctaLabel: 'CTA',
      background: '/bg.jpg',
    },
    benefits: [{ icon: 'sun', title: 'B', text: 'T' }],
    showcase: { projects: [] },
  });
}

function variablesFromGlobal(content: Content): TemplateVariableMap {
  const g = content.global as Record<string, unknown>;
  const map: TemplateVariableMap = {};
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_KEYS) {
    const v = g[key];
    map[key] = typeof v === 'string' ? v : '';
  }
  return map;
}

function baseRecordFromContent(content: Content, ts: string): StudioBaseTemplateRecord {
  return {
    styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
    content,
    updatedAt: ts,
    createdAt: ts,
  };
}

async function loadScopedContent(
  projectId: string,
  projectsRoot: string,
): Promise<Content | null> {
  const contentRepo = createProjectContentRepository({ projectsRootDir: projectsRoot });
  const seoRepo = createProjectSeoConfigRepository({ projectsRootDir: projectsRoot });
  const record = await contentRepo.getByProjectId(projectId);
  if (!record) return null;
  let c = siteContentFromRecord(record);
  const seo = await seoRepo.getByProjectId(projectId);
  if (seo) {
    c = { ...c, seo: siteSeoFromProjectSeoConfig(seo) };
  }
  return ContentSchema.parse(c);
}

function applySeoOverlay(content: Content, seo: ProjectSeoConfig | null): Content {
  if (!seo) return ContentSchema.parse(content);
  return ContentSchema.parse({
    ...content,
    seo: siteSeoFromProjectSeoConfig(seo),
  });
}

/**
 * Um passo de migração equivalente ao loop do script (paridade + gravação opcional).
 */
async function runMigrationStep(params: {
  projectId: string;
  projectsRoot: string;
  baseTemplate: StudioBaseTemplateRecord;
  dryRun: boolean;
}): Promise<{ overriddenPaths: string[]; saved: boolean }> {
  const { projectId, projectsRoot, baseTemplate, dryRun } = params;
  const seoRepo = createProjectSeoConfigRepository({ projectsRootDir: projectsRoot });
  const stateRepo = createStudioClientTemplateStateRepository({ projectsRootDir: projectsRoot });
  const resolvedContent = await loadScopedContent(projectId, projectsRoot);
  if (!resolvedContent) {
    throw new Error('sem conteúdo');
  }
  const seoConfigOnly = await seoRepo.getByProjectId(projectId);
  const existingRecord = await stateRepo.getByProjectId(projectId);
  const variables = {
    ...(existingRecord?.variables ?? {}),
    ...variablesFromGlobal(resolvedContent),
  };
  const { overrides, overriddenPaths } = buildOverridesFromResolvedContent({
    baseTemplate,
    variables,
    resolvedContent,
  });
  const now = new Date().toISOString();
  const nextState: StudioClientTemplateStateRecord = {
    projectId,
    styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
    variables,
    overrides,
    overriddenPaths,
    schemaVersion: existingRecord?.schemaVersion ?? 'migrated-style1-v1',
    updatedAt: now,
  };
  const { content: resolvedFromState } = resolveClientContent({
    baseTemplate,
    clientState: nextState,
  });
  const finalContent = applySeoOverlay(resolvedFromState, seoConfigOnly);
  expect(isDeepStrictEqual(finalContent, resolvedContent)).toBe(true);

  if (!dryRun) {
    await stateRepo.save(nextState);
    return { overriddenPaths, saved: true };
  }
  return { overriddenPaths, saved: false };
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

describe('migração style-1 (paridade com o script)', () => {
  let root: string;
  let projectsRoot: string;
  let baseTemplatesDir: string;
  const ts = '2026-06-01T10:00:00.000Z';

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'migrate-p22-'));
    projectsRoot = path.join(root, 'projects');
    baseTemplatesDir = path.join(root, 'studio', 'base-templates');
    await writeJson(path.join(baseTemplatesDir, `${STUDIO_BASE_TEMPLATE_KEY_STYLE_1}.json`), {
      ...baseRecordFromContent(templateContentWithPlaceholders(), ts),
    });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('cliente igual ao baseline: nenhum override explícito', async () => {
    const projectId = 'client-inherited';
    const baseTemplate = baseRecordFromContent(templateContentWithPlaceholders(), ts);
    const resolved = resolveClientContent({
      baseTemplate,
      clientState: {
        projectId,
        styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
        variables: variablesFromGlobal(
          ContentSchema.parse({
            ...templateContentWithPlaceholders(),
            global: {
              ...templateContentWithPlaceholders().global,
              brand: 'Acme',
              city: 'Niterói',
              whatsappE164: '5521',
              siteUrl: 'https://acme.test',
            },
          }),
        ),
        overrides: {},
        overriddenPaths: [],
        updatedAt: ts,
      },
    }).content;

    const record = buildProjectContentRecord({ projectId, content: resolved });
    await writeJson(path.join(projectsRoot, projectId, 'content.json'), record);

    const { overriddenPaths } = await runMigrationStep({
      projectId,
      projectsRoot,
      baseTemplate,
      dryRun: false,
    });

    expect(overriddenPaths.length).toBe(0);
  });

  it('cliente divergente: gera override na path alterada', async () => {
    const projectId = 'client-divergent';
    const baseTemplate = baseRecordFromContent(templateContentWithPlaceholders(), ts);
    const aligned = resolveClientContent({
      baseTemplate,
      clientState: {
        projectId,
        styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
        variables: {
          brand: 'X',
          city: 'Y',
          whatsappE164: '55',
          siteUrl: 'https://x.test',
          yearsInMarket: '',
          projectCount: '',
        },
        overrides: {},
        overriddenPaths: [],
        updatedAt: ts,
      },
    }).content;

    const divergent = ContentSchema.parse({
      ...aligned,
      hero: { ...aligned.hero, headline: 'Título totalmente customizado' },
    });
    await writeJson(
      path.join(projectsRoot, projectId, 'content.json'),
      buildProjectContentRecord({ projectId, content: divergent }),
    );

    const { overriddenPaths } = await runMigrationStep({
      projectId,
      projectsRoot,
      baseTemplate,
      dryRun: false,
    });

    expect(overriddenPaths).toContain('hero.headline');
  });

  it('migração não altera content.json do cliente', async () => {
    const projectId = 'client-stable-json';
    const baseTemplate = baseRecordFromContent(templateContentWithPlaceholders(), ts);
    const resolved = resolveClientContent({
      baseTemplate,
      clientState: {
        projectId,
        styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
        variables: {
          brand: 'Z',
          city: 'W',
          whatsappE164: '1',
          siteUrl: 'https://z.test',
          yearsInMarket: '',
          projectCount: '',
        },
        overrides: {},
        overriddenPaths: [],
        updatedAt: ts,
      },
    }).content;
    const contentPath = path.join(projectsRoot, projectId, 'content.json');
    const record = buildProjectContentRecord({ projectId, content: resolved });
    await writeJson(contentPath, record);
    const before = await readFile(contentPath, 'utf-8');

    await runMigrationStep({ projectId, projectsRoot, baseTemplate, dryRun: false });

    const after = await readFile(contentPath, 'utf-8');
    expect(after).toBe(before);
  });

  it('dry-run: não cria template-state.json', async () => {
    const projectId = 'client-dry';
    const baseTemplate = baseRecordFromContent(templateContentWithPlaceholders(), ts);
    const resolved = resolveClientContent({
      baseTemplate,
      clientState: {
        projectId,
        styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
        variables: {
          brand: 'D',
          city: 'R',
          whatsappE164: '2',
          siteUrl: 'https://d.test',
          yearsInMarket: '',
          projectCount: '',
        },
        overrides: {},
        overriddenPaths: [],
        updatedAt: ts,
      },
    }).content;
    await writeJson(
      path.join(projectsRoot, projectId, 'content.json'),
      buildProjectContentRecord({ projectId, content: resolved }),
    );

    const statePath = path.join(projectsRoot, projectId, TEMPLATE_STATE);
    await runMigrationStep({ projectId, projectsRoot, baseTemplate, dryRun: true });

    await expect(readFile(statePath, 'utf-8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe.sequential('API studio-server — template central, conteúdo resolvido, reset-field', () => {
  let dataRoot: string;
  let app: Express;
  const ts = '2026-06-02T12:00:00.000Z';
  const projectId = 'api-inherit';

  beforeAll(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), 'studio-api-p22-'));
    const projectsRoot = path.join(dataRoot, 'projects');
    const baseTemplatesDir = path.join(dataRoot, 'studio', 'base-templates');

    const tpl = templateContentWithPlaceholders();
    await writeJson(path.join(baseTemplatesDir, `${STUDIO_BASE_TEMPLATE_KEY_STYLE_1}.json`), {
      ...baseRecordFromContent(tpl, ts),
    });

    const clientGlobal = {
      ...tpl.global,
      brand: 'APIBrand',
      city: 'Rio',
      whatsappE164: '5521999887766',
      siteUrl: 'https://apibrand.test',
    };
    const stored = ContentSchema.parse({
      ...tpl,
      global: clientGlobal,
      hero: {
        ...tpl.hero,
        headline: 'Linha APIBrand na cidade Rio',
      },
    });

    await writeJson(
      path.join(projectsRoot, projectId, 'content.json'),
      buildProjectContentRecord({ projectId, content: stored }),
    );

    const state: StudioClientTemplateStateRecord = {
      projectId,
      styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
      variables: variablesFromGlobal(stored),
      overrides: {
        'hero.headline': 'Headline custom antes do reset',
      },
      overriddenPaths: ['hero.headline'],
      updatedAt: ts,
    };
    await writeJson(path.join(projectsRoot, projectId, TEMPLATE_STATE), state);

    const withOverride = ContentSchema.parse({
      ...stored,
      hero: { ...stored.hero, headline: 'Headline custom antes do reset' },
    });
    await writeJson(
      path.join(projectsRoot, projectId, 'content.json'),
      buildProjectContentRecord({ projectId, content: withOverride }),
    );

    process.env.STUDIO_TEST_DATA_ROOT = dataRoot;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
    const mod = await import('../../studio-server.ts');
    app = mod.default;
  });

  afterAll(async () => {
    delete process.env.STUDIO_TEST_DATA_ROOT;
    await rm(dataRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('GET /api/studio/base-templates/style-1 devolve o template central', async () => {
    const res = await request(app).get('/api/studio/base-templates/style-1').expect(200);
    expect(res.body.templateKey).toBe(STUDIO_BASE_TEMPLATE_KEY_STYLE_1);
    expect(res.body.content?.hero?.headline).toContain('{{brand}}');
  });

  it('PUT /api/studio/base-templates/style-1 atualiza o conteúdo do template', async () => {
    const get0 = await request(app).get('/api/studio/base-templates/style-1').expect(200);
    const prev = ContentSchema.parse(get0.body.content);
    const nextContent = ContentSchema.parse({
      ...prev,
      hero: { ...prev.hero, headline: 'Novo modelo {{brand}}' },
    });
    const put = await request(app)
      .put('/api/studio/base-templates/style-1')
      .send({ content: nextContent })
      .expect(200);
    expect(put.body.content.hero.headline).toBe('Novo modelo {{brand}}');
    const get1 = await request(app).get('/api/studio/base-templates/style-1').expect(200);
    expect(get1.body.content.hero.headline).toBe('Novo modelo {{brand}}');
  });

  it('GET /api/projects/:id/content devolve conteúdo resolvido (herança + overrides)', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/content`).expect(200);
    expect(res.body.hero.headline).toBe('Headline custom antes do reset');
    expect(res.body.global.brand).toBe('APIBrand');
  });

  it('GET com includeInheritanceMeta devolve envelope com modo inheritance', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/content`)
      .query({ includeInheritanceMeta: 'true' })
      .expect(200);
    expect(res.body.content).toBeDefined();
    expect(res.body.inheritanceMeta?.mode).toBe('inheritance');
    expect(Array.isArray(res.body.inheritanceMeta?.overriddenPaths)).toBe(true);
  });

  it('POST template-state/reset-field remove override e reflete no GET', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/template-state/reset-field`)
      .send({ path: 'hero.headline' })
      .expect(200);
    expect(res.body.hero.headline).toBe('Novo modelo APIBrand');

    const get = await request(app).get(`/api/projects/${projectId}/content`).expect(200);
    expect(get.body.hero.headline).toBe('Novo modelo APIBrand');
  });
});
