import type { Content } from '@/content/schema';
import { useToast } from '@/hooks/use-toast';
import type { BuilderInheritanceApi } from './builderInheritanceApi';
import { BuilderOverrideBadge } from './BuilderOverrideBadge';
import { BuilderResetToDefaultButton } from './BuilderResetToDefaultButton';

export type BuilderInheritanceControlsProps = {
  contentPath: string;
  inheritance?: BuilderInheritanceApi;
  onResetSuccess: (content: Content) => void;
  disabled?: boolean;
};

export function BuilderInheritanceControls({
  contentPath,
  inheritance,
  onResetSuccess,
  disabled,
}: BuilderInheritanceControlsProps) {
  const { toast } = useToast();

  if (!inheritance?.isInheritanceActive) {
    return null;
  }

  const st = inheritance.isInherited(contentPath);
  if (st === null) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <BuilderOverrideBadge variant={st ? 'inherited' : 'overridden'} />
      {!st ? (
        <BuilderResetToDefaultButton
          disabled={disabled}
          onClick={async () => {
            try {
              const next = await inheritance.resetFieldAsync(contentPath);
              onResetSuccess(next);
            } catch (error) {
              toast({
                title: 'Não foi possível reverter',
                description:
                  error instanceof Error && error.message
                    ? error.message
                    : 'Tente novamente ou salve o cliente antes.',
                variant: 'destructive',
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}
