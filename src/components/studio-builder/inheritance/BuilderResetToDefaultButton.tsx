import { RotateCcw } from 'lucide-react';
import { builderSecondaryButtonClassName } from '@/components/studio-builder/editors/BuilderEditorFields';
import { cn } from '@/lib/utils';

export type BuilderResetToDefaultButtonProps = {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function BuilderResetToDefaultButton({
  onClick,
  disabled,
  className,
}: BuilderResetToDefaultButtonProps) {
  return (
    <button
      type="button"
      className={cn(builderSecondaryButtonClassName, 'gap-1 px-2 py-1 text-[11px]', className)}
      disabled={disabled}
      onClick={() => void onClick()}
    >
      <RotateCcw className="h-3 w-3" aria-hidden />
      Padrão
    </button>
  );
}
