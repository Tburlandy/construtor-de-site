import type { Content } from '@/content/schema';
import { builderLabelClassName } from '@/components/studio-builder/editors/BuilderEditorFields';
import type { BuilderInheritanceApi } from './builderInheritanceApi';
import { BuilderInheritanceControls } from './BuilderInheritanceControls';

export type BuilderInheritedFieldChromeProps = {
  label: string;
  contentPath: string;
  inheritance?: BuilderInheritanceApi;
  onResetSuccess: (content: Content) => void;
  isBusy?: boolean;
  children: React.ReactNode;
};

/** Rótulo + badge/reset + campo; fora do modo herança mantém só rótulo + filhos. */
export function BuilderInheritedFieldChrome({
  label,
  contentPath,
  inheritance,
  onResetSuccess,
  isBusy,
  children,
}: BuilderInheritedFieldChromeProps) {
  if (!inheritance?.isInheritanceActive) {
    return (
      <div className="space-y-2">
        <p className={builderLabelClassName}>{label}</p>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <p className={builderLabelClassName}>{label}</p>
        <BuilderInheritanceControls
          contentPath={contentPath}
          inheritance={inheritance}
          onResetSuccess={onResetSuccess}
          disabled={isBusy}
        />
      </div>
      {children}
    </div>
  );
}
