import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { ProjectListItemWithContentLogo } from '@/platform/contracts';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type BuilderClientSwitcherProps = {
  projects: ProjectListItemWithContentLogo[];
  loadingProjects: boolean;
  /** Cliente atual no construtor; `null`/`undefined` em contexto sem cliente (ex.: template base). */
  currentProjectId?: string | null;
  onSelect: (projectId: string) => void;
  /** Rótulo do botão quando não há `currentProjectId` selecionado. */
  neutralLabel?: string;
  className?: string;
};

export function BuilderClientSwitcher({
  projects,
  loadingProjects,
  currentProjectId,
  onSelect,
  neutralLabel = 'Selecione um cliente',
  className,
}: BuilderClientSwitcherProps) {
  const [open, setOpen] = useState(false);

  const sortedOptions = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const byName = a.name.localeCompare(b.name, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        });
        if (byName !== 0) return byName;
        return a.projectId.localeCompare(b.projectId, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        });
      }),
    [projects],
  );

  const currentLabel = currentProjectId
    ? sortedOptions.find((e) => e.projectId === currentProjectId)?.name
    : undefined;

  const triggerText = loadingProjects
    ? 'Carregando clientes...'
    : currentLabel
      ? currentLabel
      : neutralLabel;

  return (
    <div className={cn('min-w-[240px] shrink-0', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="builder-focus-ring flex h-10 w-full items-center justify-between rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(7,15,31,0.9)] px-3.5 text-sm font-medium text-[var(--builder-text-primary)]"
            disabled={loadingProjects || sortedOptions.length === 0}
          >
            <span className="truncate text-left">{triggerText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[var(--builder-text-secondary)]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[320px] border-[var(--builder-border)] bg-[#061127] p-0 text-[var(--builder-text-primary)] shadow-[0_20px_45px_rgba(2,6,23,0.55)]"
          align="start"
        >
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Buscar cliente por nome ou ID..."
              className="text-[var(--builder-text-primary)]"
            />
            <CommandList className="max-h-[290px]">
              <CommandEmpty className="text-[var(--builder-text-secondary)]">
                Nenhum cliente encontrado.
              </CommandEmpty>
              {sortedOptions.map((entry) => (
                <CommandItem
                  key={entry.projectId}
                  value={`${entry.name} ${entry.projectId} ${entry.slug}`}
                  className="mx-1 my-0.5 rounded-[10px] px-2 py-2 data-[selected=true]:bg-[rgba(14,165,233,0.2)] data-[selected=true]:text-[var(--builder-text-primary)]"
                  onSelect={() => {
                    onSelect(entry.projectId);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--builder-text-primary)]">
                      {entry.name}
                    </p>
                    <p className="truncate text-xs text-[var(--builder-text-muted)]">{entry.slug}</p>
                  </div>
                  <Check
                    className={cn(
                      'h-4 w-4 text-[var(--builder-brand-primary)]',
                      entry.projectId === currentProjectId ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
