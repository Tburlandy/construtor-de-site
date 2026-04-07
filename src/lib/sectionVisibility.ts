import type { BuilderSectionId } from '@/components/studio-builder/builderSections';
import type { Content, HiddenPageSectionId } from '@/content/schema';
import { HIDDEN_PAGE_SECTION_IDS } from '@/content/schema';

const DOM_ANCHOR_TO_HIDDEN_SECTION: Partial<Record<string, HiddenPageSectionId>> = {
  'forma-pagamento': 'financing',
  'cuidamos-tudo': 'fullService',
  'sobre-nos': 'proofBar',
  casos: 'showcase',
  'como-funciona': 'howItWorks',
};

export function isHiddenPageSectionId(value: string): value is HiddenPageSectionId {
  return (HIDDEN_PAGE_SECTION_IDS as readonly string[]).includes(value);
}

export function isPageSectionVisible(content: Content, sectionId: HiddenPageSectionId): boolean {
  return !(content.hiddenPageSections?.includes(sectionId) ?? false);
}

/** Itens de menu com âncora para seção oculta são filtrados. */
export function isDomAnchorSectionVisible(content: Content, domSectionId: string): boolean {
  const mapped = DOM_ANCHOR_TO_HIDDEN_SECTION[domSectionId];
  if (!mapped) return true;
  return isPageSectionVisible(content, mapped);
}

export function isBuilderSectionHiddenOnPage(
  content: Content,
  sectionId: BuilderSectionId,
): boolean {
  if (!isHiddenPageSectionId(sectionId)) return false;
  return !isPageSectionVisible(content, sectionId);
}
