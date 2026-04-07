import type { Content } from '@/content/schema';
import type { BuilderSectionId } from '@/components/studio-builder/builderSections';
import { builderSecondaryButtonClassName } from '@/components/studio-builder/editors/BuilderEditorFields';
import { useToast } from '@/hooks/use-toast';
import type { BuilderInheritanceApi } from './builderInheritanceApi';
import {
  apiSectionIdForInheritanceReset,
  builderSectionHasTemplateOverrides,
} from './builderInheritanceSectionUtils';

export type BuilderSectionInheritanceToolbarProps = {
  builderSectionId: BuilderSectionId;
  inheritance?: BuilderInheritanceApi;
  onResetSuccess: (content: Content) => void;
};

export function BuilderSectionInheritanceToolbar({
  builderSectionId,
  inheritance,
  onResetSuccess,
}: BuilderSectionInheritanceToolbarProps) {
  const { toast } = useToast();

  if (!inheritance?.isInheritanceActive) {
    return null;
  }

  if (!builderSectionHasTemplateOverrides(builderSectionId, inheritance.overriddenPaths)) {
    return null;
  }

  const apiSectionId = apiSectionIdForInheritanceReset(builderSectionId);
  if (!apiSectionId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[rgba(14,165,233,0.28)] bg-[rgba(14,165,233,0.07)] px-3 py-2">
      <span className="text-xs text-[var(--builder-text-secondary)]">
        Há campos personalizados nesta seção em relação ao template base.
      </span>
      <button
        type="button"
        className={builderSecondaryButtonClassName}
        disabled={inheritance.isResettingSection}
        onClick={async () => {
          try {
            const next = await inheritance.resetSectionAsync(apiSectionId);
            onResetSuccess(next);
          } catch (error) {
            toast({
              title: 'Não foi possível reverter a seção',
              description:
                error instanceof Error && error.message
                  ? error.message
                  : 'Verifique o estado do cliente e tente de novo.',
              variant: 'destructive',
            });
          }
        }}
      >
        Reverter seção ao padrão
      </button>
    </div>
  );
}
