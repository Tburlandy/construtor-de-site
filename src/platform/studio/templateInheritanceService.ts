import { ContentSchema, type Content } from '../../content/schema.js';
import { getValueAtPath, listLeafPaths, setValueAtPath } from '../../lib/objectPaths.js';
import { resolveTemplateVariablesInObject, type TemplateVariableMap } from '../../lib/templateVariables.js';
import type { ProjectId } from '../contracts/index.js';
import type {
  StudioBaseTemplateRecord,
  StudioClientTemplateStateRecord,
  StudioFieldDivergenceSummary,
  StudioSectionDivergenceSummary,
  StudioTemplateContentPath,
  StudioTemplateOverrideValue,
} from '../contracts/studioTemplateInheritance.js';

/**
 * Blocos compostos da V1: override sempre como unidade única (orientação Estilo 1).
 */
export const V1_COMPOSITE_OVERRIDE_PATHS: readonly StudioTemplateContentPath[] = [
  'hero.stats',
  'header.menu',
  'financing.items',
  'proofBar.cards',
  'fullService.services',
  'howItWorks.steps',
  'showcase.projects',
  'benefits',
  'hiddenPageSections',
  'imageLayout',
] as const;

const COMPOSITE_SET = new Set<string>(V1_COMPOSITE_OVERRIDE_PATHS);

export type ResolveClientContentParams = {
  baseTemplate: StudioBaseTemplateRecord;
  clientState: StudioClientTemplateStateRecord;
};

export type ResolveClientContentResult = {
  content: Content;
  /** Template central após interpolação das variáveis do cliente, sem overrides. */
  inheritedBaseline: Content;
  /** Paths com override aplicado (cópia da lista do estado). */
  overriddenPaths: StudioTemplateContentPath[];
  /** Número de entradas aplicadas de `clientState.overrides`. */
  appliedOverrideCount: number;
};

export type BuildOverridesFromResolvedContentParams = {
  baseTemplate: StudioBaseTemplateRecord;
  variables: TemplateVariableMap;
  resolvedContent: Content;
};

export type BuildOverridesFromResolvedContentResult = {
  overrides: Record<string, StudioTemplateOverrideValue>;
  overriddenPaths: StudioTemplateContentPath[];
};

export type RemoveOverridePathParams = {
  clientState: StudioClientTemplateStateRecord;
  path: StudioTemplateContentPath;
};

export type IsPathInheritedParams = {
  clientState: StudioClientTemplateStateRecord;
  path: StudioTemplateContentPath;
};

export type SummarizeClientDivergenceParams = {
  baseTemplate: StudioBaseTemplateRecord;
  variables: TemplateVariableMap;
  resolvedContent: Content;
};

export type SummarizeClientDivergenceResult = {
  /** Paths onde o conteúdo difere do baseline herdado (interpolação só). */
  divergentPaths: StudioTemplateContentPath[];
  /** Um item por path divergente; `divergentClientCount` = 1 para visão single-client. */
  fieldSummaries: StudioFieldDivergenceSummary[];
  sectionSummaries: StudioSectionDivergenceSummary[];
};

export type GlobalDivergenceClientInput = {
  projectId: ProjectId;
  variables: TemplateVariableMap;
  resolvedContent: Content;
};

export type SummarizeGlobalDivergenceAcrossClientsParams = {
  baseTemplate: StudioBaseTemplateRecord;
  clients: GlobalDivergenceClientInput[];
};

export type SummarizeGlobalDivergenceAcrossClientsResult = {
  fieldSummaries: StudioFieldDivergenceSummary[];
  sectionSummaries: StudioSectionDivergenceSummary[];
};

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a !== 'object') {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a)) {
    const aa = a as unknown[];
    const bb = b as unknown[];
    if (aa.length !== bb.length) {
      return false;
    }
    return aa.every((v, i) => deepEqual(v, bb[i]));
  }
  const ka = Object.keys(a as object).sort();
  const kb = Object.keys(b as object).sort();
  if (ka.length !== kb.length) {
    return false;
  }
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) {
      return false;
    }
    const key = ka[i];
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

function isPathUnderCompositeChild(leaf: string, composites: readonly string[]): boolean {
  for (const c of composites) {
    if (leaf !== c && leaf.startsWith(`${c}.`)) {
      return true;
    }
  }
  return false;
}

function buildInheritedBaselineContent(
  baseTemplate: StudioBaseTemplateRecord,
  variables: TemplateVariableMap,
): Content {
  const raw = clonePlain(baseTemplate.content);
  const interpolated = resolveTemplateVariablesInObject(raw, variables);
  return ContentSchema.parse(interpolated);
}

/**
 * Resolve conteúdo final: template + variáveis + overrides por path, validado com `ContentSchema`.
 */
export function resolveClientContent(params: ResolveClientContentParams): ResolveClientContentResult {
  const { baseTemplate, clientState } = params;
  const inheritedBaseline = buildInheritedBaselineContent(baseTemplate, clientState.variables);

  let merged: unknown = clonePlain(inheritedBaseline);
  const pathsToApply = [...clientState.overriddenPaths].sort();
  let applied = 0;

  for (const path of pathsToApply) {
    if (!Object.prototype.hasOwnProperty.call(clientState.overrides, path)) {
      continue;
    }
    const value = clientState.overrides[path];
    merged = setValueAtPath(merged, path, value);
    applied += 1;
  }

  const content = ContentSchema.parse(merged);

  return {
    content,
    inheritedBaseline,
    overriddenPaths: [...clientState.overriddenPaths],
    appliedOverrideCount: applied,
  };
}

/**
 * Deriva mapa de overrides a partir de um `Content` completo (ex.: após PUT) comparando ao baseline herdado.
 */
export function buildOverridesFromResolvedContent(
  params: BuildOverridesFromResolvedContentParams,
): BuildOverridesFromResolvedContentResult {
  const inherited = buildInheritedBaselineContent(params.baseTemplate, params.variables);
  const { overrides, paths } = collectOverridesFromDiff(inherited, params.resolvedContent);
  return { overrides, overriddenPaths: paths };
}

function collectOverridesFromDiff(
  inherited: Content,
  resolved: Content,
): { overrides: Record<string, StudioTemplateOverrideValue>; paths: StudioTemplateContentPath[] } {
  const overrides: Record<string, StudioTemplateOverrideValue> = {};
  const paths: StudioTemplateContentPath[] = [];
  const handled = new Set<string>();

  for (const c of V1_COMPOSITE_OVERRIDE_PATHS) {
    const bi = getValueAtPath(inherited, c);
    const br = getValueAtPath(resolved, c);
    if (!deepEqual(bi, br)) {
      overrides[c] = clonePlain(br) as StudioTemplateOverrideValue;
      paths.push(c);
      handled.add(c);
    }
  }

  const leafUnion = new Set<string>([
    ...listLeafPaths(inherited, { arraysAsLeaves: true }),
    ...listLeafPaths(resolved, { arraysAsLeaves: true }),
  ]);

  for (const leaf of [...leafUnion].sort()) {
    if (handled.has(leaf)) {
      continue;
    }
    if (COMPOSITE_SET.has(leaf)) {
      continue;
    }
    if (isPathUnderCompositeChild(leaf, V1_COMPOSITE_OVERRIDE_PATHS)) {
      continue;
    }
    const bi = getValueAtPath(inherited, leaf);
    const br = getValueAtPath(resolved, leaf);
    if (!deepEqual(bi, br)) {
      overrides[leaf] = clonePlain(br) as StudioTemplateOverrideValue;
      paths.push(leaf as StudioTemplateContentPath);
      handled.add(leaf);
    }
  }

  return { overrides, paths };
}

/**
 * Remove override em uma path: estado sem a entrada e sem a path na lista (volta ao herdado real após novo resolve).
 */
export function removeOverridePath(params: RemoveOverridePathParams): StudioClientTemplateStateRecord {
  const { clientState, path } = params;
  const nextOverrides = { ...clientState.overrides };
  delete nextOverrides[path];
  const nextPaths = clientState.overriddenPaths.filter((p) => p !== path);
  return {
    ...clientState,
    overrides: nextOverrides,
    overriddenPaths: nextPaths,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * `true` se não há override ativo registrado para a path (fonte de verdade: `overriddenPaths`).
 */
export function isPathInherited(params: IsPathInheritedParams): boolean {
  return !params.clientState.overriddenPaths.includes(params.path);
}

/**
 * Divergência de um cliente em relação ao baseline interpolado (campos + seções agregadas).
 */
export function summarizeClientDivergence(
  params: SummarizeClientDivergenceParams,
): SummarizeClientDivergenceResult {
  const inherited = buildInheritedBaselineContent(params.baseTemplate, params.variables);
  const { paths } = collectOverridesFromDiff(inherited, params.resolvedContent);

  const fieldSummaries: StudioFieldDivergenceSummary[] = paths.map((p) => ({
    path: p,
    divergentClientCount: 1,
    divergentProjectIds: undefined,
  }));

  const sectionSummaries = buildSectionSummariesFromPaths(paths, 1);

  return {
    divergentPaths: paths,
    fieldSummaries,
    sectionSummaries,
  };
}

/**
 * Agrega divergências de vários clientes (visão da central): contagens por path e por seção.
 */
export function summarizeGlobalDivergenceAcrossClients(
  params: SummarizeGlobalDivergenceAcrossClientsParams,
): SummarizeGlobalDivergenceAcrossClientsResult {
  const pathToProjects = new Map<string, Set<ProjectId>>();

  for (const client of params.clients) {
    const inherited = buildInheritedBaselineContent(params.baseTemplate, client.variables);
    const { paths } = collectOverridesFromDiff(inherited, client.resolvedContent);
    for (const p of paths) {
      let set = pathToProjects.get(p);
      if (!set) {
        set = new Set();
        pathToProjects.set(p, set);
      }
      set.add(client.projectId);
    }
  }

  const fieldSummaries: StudioFieldDivergenceSummary[] = [...pathToProjects.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, ids]) => ({
      path: path as StudioTemplateContentPath,
      divergentClientCount: ids.size,
      divergentProjectIds: [...ids].sort(),
    }));

  const sectionMap = new Map<
    string,
    { projectIds: Set<ProjectId>; paths: Set<StudioTemplateContentPath> }
  >();

  for (const summary of fieldSummaries) {
    const sectionId = sectionIdFromPath(summary.path);
    let block = sectionMap.get(sectionId);
    if (!block) {
      block = { projectIds: new Set(), paths: new Set() };
      sectionMap.set(sectionId, block);
    }
    summary.divergentProjectIds?.forEach((id) => block!.projectIds.add(id));
    block.paths.add(summary.path);
  }

  const sectionSummaries: StudioSectionDivergenceSummary[] = [...sectionMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sectionId, block]) => ({
      sectionId,
      divergentClientCount: block.projectIds.size,
      divergentFieldCount: block.paths.size,
      divergentFieldPaths: [...block.paths].sort(),
    }));

  return { fieldSummaries, sectionSummaries };
}

function sectionIdFromPath(path: string): string {
  const dot = path.indexOf('.');
  return dot === -1 ? path : path.slice(0, dot);
}

function buildSectionSummariesFromPaths(
  paths: StudioTemplateContentPath[],
  divergentClientCount: number,
): StudioSectionDivergenceSummary[] {
  const sectionMap = new Map<string, Set<StudioTemplateContentPath>>();
  for (const p of paths) {
    const sid = sectionIdFromPath(p);
    let s = sectionMap.get(sid);
    if (!s) {
      s = new Set();
      sectionMap.set(sid, s);
    }
    s.add(p);
  }
  return [...sectionMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sectionId, set]) => ({
      sectionId,
      divergentClientCount,
      divergentFieldCount: set.size,
      divergentFieldPaths: [...set].sort(),
    }));
}
