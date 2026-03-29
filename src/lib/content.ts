// Utilitário para ler e processar conteúdo dinâmico
import { useState, useEffect } from 'react';
import type { Content } from '@/content/schema';
import contentJson from '@/../content/content.json';

let cachedContent: Content | null = null;
const cachedProjectContent = new Map<string, Content>();

// Substitui variáveis {{var}} pelos valores do env ou do conteúdo
function prefixBasePath(text: string): string {
  if (typeof window === 'undefined') return text;
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/' || !text.startsWith('/') || text.startsWith('//') || text.startsWith(base)) {
    return text;
  }
  return `${base.replace(/\/$/, '')}${text}`;
}

function replaceVariables(text: string, content?: any): string {
  if (typeof window === 'undefined') return text;
  
  // Se temos conteúdo, usa ele; senão usa env vars
  const brand = content?.global?.brand || import.meta.env.VITE_BRAND_NAME || 'EFITEC SOLAR';
  const city = content?.global?.city || import.meta.env.VITE_CITY || 'Niterói - RJ';
  const whatsappE164 = content?.global?.whatsappE164 || import.meta.env.VITE_WPP_E164 || '5521999999999';
  const siteUrl =
    content?.global?.siteUrl ||
    import.meta.env.VITE_PROJECT_DOMAIN ||
    import.meta.env.VITE_SITE_URL ||
    'https://www.efitecsolar.com';
  
  const replaced = text
    .replace(/\{\{siteUrl\}\}/g, siteUrl)
    .replace(/\{\{brand\}\}/g, brand)
    .replace(/\{\{city\}\}/g, city)
    .replace(/\{\{whatsappE164\}\}/g, whatsappE164);
  return prefixBasePath(replaced);
}

// Processa objeto recursivamente substituindo variáveis
function processContent(content: any, rootContent?: any): any {
  if (typeof content === 'string') {
    return replaceVariables(content, rootContent || content);
  }
  if (Array.isArray(content)) {
    return content.map(item => processContent(item, rootContent || content));
  }
  if (content && typeof content === 'object') {
    const processed: any = {};
    const root = rootContent || content;
    for (const [key, value] of Object.entries(content)) {
      processed[key] = processContent(value, root);
    }
    return processed;
  }
  return content;
}

function normalizeProjectId(projectId?: string | null): string | null {
  if (!projectId) return null;
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Retorna conteúdo processado (importado diretamente no build, sem fetch)
export async function fetchContent(): Promise<Content> {
  // Se já temos cache, retorna
  if (cachedContent) {
    return cachedContent;
  }

  // Usa o JSON importado diretamente (sem fetch, carrega instantâneo)
  const processed = processContent(contentJson, contentJson);
  cachedContent = processed as Content;
  return cachedContent;
}

// Retorna conteúdo no escopo de projeto com fallback para o conteúdo legado.
export async function fetchProjectContent(projectId: string): Promise<Content> {
  const normalizedProjectId = normalizeProjectId(projectId);
  if (!normalizedProjectId) {
    return fetchContent();
  }

  const cached = cachedProjectContent.get(normalizedProjectId);
  if (cached) {
    return cached;
  }

  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(normalizedProjectId)}/content`,
      );
      if (response.ok) {
        const projectContent = (await response.json()) as Content;
        const processed = processContent(projectContent, projectContent) as Content;
        cachedProjectContent.set(normalizedProjectId, processed);
        return processed;
      }
    } catch {
      // fallback silencioso para fluxo legado
    }
  }

  return fetchContent();
}

// Versão síncrona para uso imediato (sem loading)
export function getContentSync(): Content {
  if (cachedContent) {
    return cachedContent;
  }
  const processed = processContent(contentJson, contentJson);
  cachedContent = processed as Content;
  return cachedContent;
}

// Limpa cache (útil após atualizações no Studio)
export function clearContentCache() {
  cachedContent = null;
  cachedProjectContent.clear();
}

// Hook React para usar conteúdo
export function useContent(projectId?: string) {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const normalizedProjectId = normalizeProjectId(projectId);
    const loader = normalizedProjectId
      ? fetchProjectContent(normalizedProjectId)
      : fetchContent();

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
