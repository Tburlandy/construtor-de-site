import { useEffect, useState } from 'react';
import { ContentSchema, type Content } from '@/content/schema';

import { resolveTemplateVariablesInString, type TemplateVariableMap } from './templateVariables';

/**
 * Conteúdo de projeto no Studio deve refletir baseline do template central + variáveis + overrides
 * (`GET /api/projects/:id/content` no studio-server e, em dev, no vite-plugin-studio).
 * O runtime aplica ainda `processRuntimeContent` (placeholders remanescentes + BASE_URL em paths).
 */

/** Detecta URL de GET de conteúdo por projeto (com ou sem prefixo do Vite base). */
function isProjectScopedContentUrl(candidate: string): boolean {
  const pathOnly = candidate.split('?')[0] ?? '';
  return pathOnly.includes('/api/projects/') && pathOnly.endsWith('/content');
}

/**
 * Normaliza a resposta do GET de conteúdo do projeto: `Content` puro ou envelope
 * `{ content, inheritanceMeta }` quando `includeInheritanceMeta` está ativo.
 */
export function parseResolvedProjectContentPayload(payload: unknown): Content {
  if (
    payload &&
    typeof payload === 'object' &&
    'content' in payload &&
    'inheritanceMeta' in payload
  ) {
    return ContentSchema.parse((payload as { content: unknown }).content);
  }
  return ContentSchema.parse(payload);
}

let cachedContent: Content | null = null;
const cachedProjectContent = new Map<string, Content>();
let runtimeContentOverride: Content | null = null;

function getNormalizedBasePath(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  if (rawBase === '/') {
    return '/';
  }

  const normalized = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function withBase(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getNormalizedBasePath();
  if (base === '/') {
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
}

function uniqueCandidates(candidates: string[]): string[] {
  const unique = new Set<string>();
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }
  return [...unique];
}

function getStaticContentCandidates(): string[] {
  return uniqueCandidates([withBase('/content/content.json'), '/content/content.json']);
}

function getDefaultContentCandidates(): string[] {
  if (!__STUDIO_ENABLED__) {
    return getStaticContentCandidates();
  }

  return uniqueCandidates(['/api/content', withBase('/api/content'), ...getStaticContentCandidates()]);
}

function getProjectContentCandidates(projectId: string): string[] {
  const endpoint = `/api/projects/${encodeURIComponent(projectId)}/content`;
  return uniqueCandidates([endpoint, withBase(endpoint)]);
}

// Substitui variáveis {{var}} e prefixa caminhos relativos com BASE_URL.
function prefixBasePath(text: string): string {
  if (typeof window === 'undefined') return text;
  const base = getNormalizedBasePath();

  if (base === '/' || !text.startsWith('/') || text.startsWith('//')) {
    return text;
  }

  if (text === base || text.startsWith(`${base}/`)) {
    return text;
  }

  return `${base}${text}`;
}

function getGlobalString(content: unknown, key: string): string | undefined {
  if (!content || typeof content !== 'object') {
    return undefined;
  }

  const maybeGlobal = (content as { global?: unknown }).global;
  if (!maybeGlobal || typeof maybeGlobal !== 'object') {
    return undefined;
  }

  const value = (maybeGlobal as Record<string, unknown>)[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildTemplateVariableMapFromContent(content?: unknown): TemplateVariableMap {
  return {
    brand:
      getGlobalString(content, 'brand') || import.meta.env.VITE_BRAND_NAME || 'EFITEC SOLAR',
    city: getGlobalString(content, 'city') || import.meta.env.VITE_CITY || 'Niterói - RJ',
    whatsappE164:
      getGlobalString(content, 'whatsappE164') ||
      import.meta.env.VITE_WPP_E164 ||
      '5521999999999',
    siteUrl:
      getGlobalString(content, 'siteUrl') ||
      import.meta.env.VITE_PROJECT_DOMAIN ||
      import.meta.env.VITE_SITE_URL ||
      'https://www.efitecsolar.com',
    yearsInMarket:
      getGlobalString(content, 'yearsInMarket') || import.meta.env.VITE_YEARS_IN_MARKET || '',
    projectCount:
      getGlobalString(content, 'projectCount') || import.meta.env.VITE_PROJECT_COUNT || '',
  };
}

function processContent(content: unknown, rootContent?: unknown): unknown {
  const root = rootContent ?? content;
  const variables = buildTemplateVariableMapFromContent(root);

  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const replaced = resolveTemplateVariablesInString(node, variables);
      if (typeof window === 'undefined') {
        return replaced;
      }
      return prefixBasePath(replaced);
    }

    if (Array.isArray(node)) {
      return node.map((item) => walk(item));
    }

    if (node && typeof node === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        processed[key] = walk(value);
      }
      return processed;
    }

    return node;
  };

  return walk(content);
}

function processRuntimeContent(content: Content): Content {
  return processContent(content, content) as Content;
}

function normalizeProjectId(projectId?: string | null): string | null {
  if (!projectId) return null;
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getRuntimeContentOverride(): Content | null {
  return runtimeContentOverride;
}

async function tryReadContent(candidate: string): Promise<Content | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(candidate);
    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const parsed = isProjectScopedContentUrl(candidate)
      ? parseResolvedProjectContentPayload(payload)
      : ContentSchema.parse(payload);
    return processRuntimeContent(parsed);
  } catch {
    return null;
  }
}

async function loadFirstAvailableContent(candidates: string[]): Promise<Content | null> {
  for (const candidate of candidates) {
    const content = await tryReadContent(candidate);
    if (content) {
      return content;
    }
  }

  return null;
}

export function setContentRuntimeOverride(content: Content | null): void {
  if (!content) {
    runtimeContentOverride = null;
    return;
  }

  runtimeContentOverride = processRuntimeContent(content);
}

export async function bootstrapRuntimeContent(): Promise<Content> {
  const content = await fetchContent();
  runtimeContentOverride = content;
  return content;
}

export async function fetchContent(): Promise<Content> {
  const override = getRuntimeContentOverride();
  if (override) {
    return override;
  }

  if (cachedContent) {
    return cachedContent;
  }

  const candidates = getDefaultContentCandidates();
  const loaded = await loadFirstAvailableContent(candidates);
  if (!loaded) {
    throw new Error(
      `[content] Não foi possível carregar conteúdo em runtime. Candidatos tentados: ${candidates.join(', ')}`,
    );
  }

  cachedContent = loaded;
  return cachedContent;
}

export async function fetchProjectContent(projectId: string): Promise<Content> {
  const normalizedProjectId = normalizeProjectId(projectId);
  if (!normalizedProjectId) {
    return fetchContent();
  }

  const cached = cachedProjectContent.get(normalizedProjectId);
  if (cached) {
    return cached;
  }

  if (__STUDIO_ENABLED__) {
    const projectCandidates = getProjectContentCandidates(normalizedProjectId);
    const projectContent = await loadFirstAvailableContent(projectCandidates);
    if (projectContent) {
      cachedProjectContent.set(normalizedProjectId, projectContent);
      return projectContent;
    }
  }

  const override = getRuntimeContentOverride();
  if (override) {
    return override;
  }

  return fetchContent();
}

export function getContentSync(): Content {
  const override = getRuntimeContentOverride();
  if (override) {
    return override;
  }

  if (cachedContent) {
    return cachedContent;
  }

  throw new Error(
    '[content] Conteúdo não inicializado. Chame bootstrapRuntimeContent() antes de usar getContentSync().',
  );
}

export function clearContentCache(): void {
  cachedContent = null;
  cachedProjectContent.clear();
}

export function useContent(projectId?: string): { content: Content | null; loading: boolean } {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const normalizedProjectId = normalizeProjectId(projectId);
    const loader = normalizedProjectId ? fetchProjectContent(normalizedProjectId) : fetchContent();

    loader
      .then((data) => {
        if (cancelled) return;
        setContent(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { content, loading };
}
