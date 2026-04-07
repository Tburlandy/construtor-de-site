import type { BuilderSectionId } from '@/components/studio-builder/builderSections';

/** `global` no builder edita `header.*` no conteúdo — reset de seção usa id `header`. */
export function apiSectionIdForInheritanceReset(builderSectionId: BuilderSectionId): string | null {
  switch (builderSectionId) {
    case 'global':
      return 'header';
    case 'seo':
    case 'hero':
    case 'proofBar':
    case 'fullService':
    case 'howItWorks':
    case 'showcase':
    case 'faq':
      return builderSectionId;
    default:
      return null;
  }
}

export function builderSectionHasTemplateOverrides(
  builderSectionId: BuilderSectionId,
  overriddenPaths: readonly string[],
): boolean {
  if (!overriddenPaths.length) {
    return false;
  }
  if (builderSectionId === 'global') {
    return overriddenPaths.some((p) => p.startsWith('header.'));
  }
  if (builderSectionId === 'hero') {
    return overriddenPaths.some(
      (p) => p === 'hero' || p.startsWith('hero.') || p === 'imageLayout',
    );
  }
  if (builderSectionId === 'howItWorks') {
    return overriddenPaths.some(
      (p) => p === 'howItWorks' || p.startsWith('howItWorks.') || p === 'imageLayout',
    );
  }
  const api = apiSectionIdForInheritanceReset(builderSectionId);
  if (!api) {
    return false;
  }
  return overriddenPaths.some((p) => p === api || p.startsWith(`${api}.`));
}
