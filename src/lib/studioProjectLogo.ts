/** Logo padrão quando não há arquivo em mídia nem URL em `content.global.logo`. */
export const FALLBACK_STUDIO_PROJECT_LOGO_URL =
  'https://www.efitecsolar.com/assets/images/logo.png';

export function buildProjectMediaLogoUrl(projectId: string): string {
  return `/media/projects/${encodeURIComponent(projectId)}/img/logo.webp`;
}

/**
 * Mesma prioridade do site (`Header`): URL do conteúdo, depois thumb em disco, implícito pelo onError do componente.
 */
export function resolveStudioProjectLogoSrc(options: {
  projectId: string;
  contentLogoUrl?: string | null;
}): string {
  const fromContent = options.contentLogoUrl?.trim();
  if (fromContent) {
    return fromContent;
  }
  return buildProjectMediaLogoUrl(options.projectId);
}
