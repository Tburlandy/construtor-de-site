/**
 * Migração inicial — herança Estilo 1 (template central + variáveis + overrides).
 *
 * Requisito: Node com carregamento TS (tsx já em devDependencies):
 *   npm run migrate:style1-inheritance -- [--dry-run] [--force]
 *
 * Ou: node --import tsx scripts/migrate-style1-template-inheritance.mjs [--dry-run] [--force]
 *
 * Responsabilidades:
 * 1. Baseline: garante template central style-1 (exceto em --dry-run sem arquivo: usa seed em memória).
 * 2. Lista projetos em data/projects com content.json.
 * 3. Para cada um: lê Content resolvido atual (content.json + seo.json), deriva overrides vs baseline.
 * 4. Verifica que resolve(estado_novo) + SEO === conteúdo atual (não altera o resultado visual).
 * 5. Grava template-state.json (salta se já existir, salvo --force).
 *
 * @see docs/cursor/00-orientacao-geral-template-heranca-style1.md
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { ContentSchema } from '../src/content/schema.ts';
import { SUPPORTED_TEMPLATE_VARIABLE_KEYS } from '../src/lib/templateVariables.ts';
import { createProjectContentRepository } from '../src/platform/repositories/projectContentRepository.ts';
import { createProjectSeoConfigRepository } from '../src/platform/repositories/projectSeoConfigRepository.ts';
import { siteContentFromRecord } from '../src/platform/repositories/projectSiteContentBridge.ts';
import { siteSeoFromProjectSeoConfig } from '../src/platform/repositories/projectSeoConfigBridge.ts';
import {
  STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
  createStudioBaseTemplateRepository,
} from '../src/platform/repositories/studioBaseTemplateRepository.ts';
import { createStudioClientTemplateStateRepository } from '../src/platform/repositories/studioClientTemplateStateRepository.ts';
import { StudioBaseTemplateRecordSchema } from '../src/platform/contracts/studioTemplateInheritance.ts';
import {
  buildOverridesFromResolvedContent,
  resolveClientContent,
} from '../src/platform/studio/templateInheritanceService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(REPO_ROOT, 'data', 'projects');
const BASE_TEMPLATES_DIR = path.join(REPO_ROOT, 'data', 'studio', 'base-templates');
const SEED_CONTENT_PATH = path.join(REPO_ROOT, 'content', 'content.json');
const TEMPLATE_STATE_FILENAME = 'template-state.json';

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  return { dryRun, force };
}

/** @param {import('../src/content/schema.ts').Content} content */
function buildTemplateVariableMapFromContentGlobal(content) {
  const g = content.global;
  /** @type {import('../src/lib/templateVariables.ts').TemplateVariableMap} */
  const map = {};
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_KEYS) {
    const v = g[key];
    map[key] = typeof v === 'string' ? v : '';
  }
  return map;
}

/**
 * Conteúdo atual do cliente como o Studio usa (content.json + overlay seo.json).
 */
async function loadProjectScopedContentForMigration(projectId, contentRepo, seoRepo) {
  const record = await contentRepo.getByProjectId(projectId);
  if (!record) {
    return null;
  }
  let content = siteContentFromRecord(record);
  const seoConfig = await seoRepo.getByProjectId(projectId);
  if (seoConfig) {
    content = { ...content, seo: siteSeoFromProjectSeoConfig(seoConfig) };
  }
  return ContentSchema.parse(content);
}

async function templateStateExists(projectId) {
  const p = path.join(PROJECTS_DIR, projectId, TEMPLATE_STATE_FILENAME);
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readSeedContentForBaseline() {
  try {
    const raw = await fs.readFile(SEED_CONTENT_PATH, 'utf-8');
    return ContentSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Após resolver herança, aplica o mesmo overlay de SEO que loadProjectScopedContent.
 */
function applySeoOverlayToContent(content, seoRepoResult) {
  if (!seoRepoResult) {
    return ContentSchema.parse(content);
  }
  return ContentSchema.parse({
    ...content,
    seo: siteSeoFromProjectSeoConfig(seoRepoResult),
  });
}

async function main() {
  const { dryRun, force } = parseArgs(process.argv.slice(2));

  console.log('[migrate-style1-inheritance] Início');
  console.log(`  Modo: ${dryRun ? 'DRY-RUN (sem escrita)' : 'APLICAR'}`);
  console.log(`  Projetos: ${PROJECTS_DIR}`);
  console.log(`  Template base: ${BASE_TEMPLATES_DIR}`);
  if (force) {
    console.log('  --force: sobrescreve template-state.json existente');
  }

  const contentRepo = createProjectContentRepository({ projectsRootDir: PROJECTS_DIR });
  const seoRepo = createProjectSeoConfigRepository({ projectsRootDir: PROJECTS_DIR });
  const baseRepo = createStudioBaseTemplateRepository({
    baseTemplatesDir: BASE_TEMPLATES_DIR,
    seedContentPath: SEED_CONTENT_PATH,
  });
  const stateRepo = createStudioClientTemplateStateRepository({ projectsRootDir: PROJECTS_DIR });

  let baseTemplate = await baseRepo.getByTemplateKey(STUDIO_BASE_TEMPLATE_KEY_STYLE_1);

  if (!baseTemplate) {
    if (dryRun) {
      const seed = await readSeedContentForBaseline();
      if (!seed) {
        console.error(
          '[migrate-style1-inheritance] ERRO: não há style-1.json nem content/content.json para baseline em dry-run.',
        );
        process.exitCode = 1;
        return;
      }
      const ts = new Date().toISOString();
      baseTemplate = StudioBaseTemplateRecordSchema.parse({
        styleId: STUDIO_BASE_TEMPLATE_KEY_STYLE_1,
        content: seed,
        updatedAt: ts,
        createdAt: ts,
      });
      console.log(
        '[migrate-style1-inheritance] [dry-run] Baseline em memória a partir de content/content.json (style-1.json seria criado na execução real).',
      );
    } else {
      baseTemplate = await baseRepo.ensureDefaultStyle1Exists();
      console.log('[migrate-style1-inheritance] Template central style-1 garantido em disco.');
    }
  } else {
    console.log('[migrate-style1-inheritance] Template central style-1 já existente — baseline consolidado.');
  }

  let dirents;
  try {
    dirents = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
      console.log('[migrate-style1-inheritance] Nenhuma pasta data/projects — nada a migrar.');
      return;
    }
    throw e;
  }

  const projectIds = [];
  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const id = d.name;
    const contentPath = path.join(PROJECTS_DIR, id, 'content.json');
    try {
      await fs.access(contentPath);
      projectIds.push(id);
    } catch {
      /* skip */
    }
  }

  projectIds.sort((a, b) => a.localeCompare(b));

  /** @type {Map<string, number>} */
  const pathFrequency = new Map();

  let processed = 0;
  let skippedExisting = 0;
  let skippedNoContent = 0;
  let failed = 0;
  const failures = [];

  for (const projectId of projectIds) {
    const hasState = await templateStateExists(projectId);
    if (hasState && !force) {
      skippedExisting += 1;
      console.log(`  ⊘ ${projectId} — já possui ${TEMPLATE_STATE_FILENAME} (use --force para recalcular)`);
      continue;
    }

    const resolvedContent = await loadProjectScopedContentForMigration(projectId, contentRepo, seoRepo);
    if (!resolvedContent) {
      skippedNoContent += 1;
      console.log(`  ⊘ ${projectId} — sem registro de conteúdo`);
      continue;
    }

    const seoConfigOnly = await seoRepo.getByProjectId(projectId);

    try {
      const existingRecord = await stateRepo.getByProjectId(projectId);
      const variables = {
        ...(existingRecord?.variables ?? {}),
        ...buildTemplateVariableMapFromContentGlobal(resolvedContent),
      };
      const { overrides, overriddenPaths } = buildOverridesFromResolvedContent({
        baseTemplate,
        variables,
        resolvedContent,
      });

      const now = new Date().toISOString();
      const nextState = {
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
      const finalContent = applySeoOverlayToContent(resolvedFromState, seoConfigOnly);
      const expected = ContentSchema.parse(resolvedContent);

      if (!isDeepStrictEqual(finalContent, expected)) {
        failed += 1;
        failures.push({ projectId, reason: 'conteúdo resolvido pós-migração difere do atual (abortado)' });
        console.error(`  ✖ ${projectId} — verificação de paridade falhou (nenhum ficheiro alterado para este id)`);
        continue;
      }

      for (const p of overriddenPaths) {
        pathFrequency.set(p, (pathFrequency.get(p) ?? 0) + 1);
      }

      processed += 1;
      const pathsLabel = overriddenPaths.length ? `${overriddenPaths.length} paths` : 'sem overrides';
      if (dryRun) {
        console.log(`  ◆ ${projectId} — [dry-run] gravaria ${TEMPLATE_STATE_FILENAME} (${pathsLabel})`);
      } else {
        await stateRepo.save(nextState);
        console.log(`  ✓ ${projectId} — ${TEMPLATE_STATE_FILENAME} gravado (${pathsLabel})`);
      }
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ projectId, reason: msg });
      console.error(`  ✖ ${projectId} — ${msg}`);
    }
  }

  const topPaths = [...pathFrequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 25);

  console.log('\n--- Relatório ---');
  console.log(`Clientes com content.json considerados: ${projectIds.length}`);
  console.log(`Migrados com sucesso (${dryRun ? 'simulados' : 'reais'}): ${processed}`);
  console.log(`Ignorados (já com template-state): ${skippedExisting}`);
  console.log(`Ignorados (sem conteúdo): ${skippedNoContent}`);
  console.log(`Falhas: ${failed}`);
  if (topPaths.length) {
    console.log('\nPaths mais frequentes entre clientes processados nesta execução:');
    for (const [p, n] of topPaths) {
      console.log(`  ${n}×  ${p}`);
    }
  }
  if (failures.length) {
    console.log('\nDetalhe das falhas:');
    for (const f of failures) {
      console.log(`  - ${f.projectId}: ${f.reason}`);
    }
    process.exitCode = 1;
  }

  if (dryRun) {
    console.log('\n[dry-run] Nenhum ficheiro foi escrito. Execute sem --dry-run para aplicar.');
  }
}

main().catch((e) => {
  console.error('[migrate-style1-inheritance] Erro fatal:', e);
  process.exitCode = 1;
});
