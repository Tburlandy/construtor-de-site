import type { Content } from '@/content/schema';

/** Contrato mínimo passado pelo `StudioProjectShell` ao `BuilderEditorPanel` (sem acoplar ao hook). */
export type BuilderInheritanceApi = {
  isInheritanceActive: boolean;
  isInherited: (path: string) => boolean | null;
  overriddenPaths: readonly string[];
  resetFieldAsync: (path: string) => Promise<Content>;
  resetSectionAsync: (sectionId: string) => Promise<Content>;
  isResettingField: boolean;
  isResettingSection: boolean;
};
