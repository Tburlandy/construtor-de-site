import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Copy, Plus, Save, UploadCloud, WandSparkles } from 'lucide-react';
import type { ProjectMetadata } from '@/platform/contracts';
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
import {
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
} from './editors/BuilderEditorFields';

interface BuilderTopbarProps {
  project: ProjectMetadata | null;
  projects: ProjectMetadata[];
  currentProjectId: string;
  loadingProjects: boolean;
  saving: boolean;
  exportingZip: boolean;
  publishing: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  onProjectChange: (projectId: string) => void;
  onSave: () => void;
  onExportZip: () => void;
  onOpenPublish: () => void;
  onOpenCreateProject: () => void;
  onOpenDuplicateProject: () => void;
}

const FALLBACK_PROJECT_LOGO_URL = 'https://www.efitecsolar.com/assets/images/logo.png';

function buildProjectLogoUrl(projectId: string): string {
  return `/media/projects/${encodeURIComponent(projectId)}/img/logo.webp`;
}

function formatSavedAt(isoDate: string | null): string {
  if (!isoDate) {
    return 'Ainda não salvo';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Salvo recentemente';
  }

  return `Salvo às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatProjectStatusLabel(status: ProjectMetadata['status']): string {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'active':
      return 'Ativo';
    case 'archived':
      return 'Arquivado';
    default:
      return status;
  }
}

export function BuilderTopbar({
  project,
  projects,
  currentProjectId,
  loadingProjects,
  saving,
  exportingZip,
  publishing,
  hasUnsavedChanges,
  lastSavedAt,
  onProjectChange,
  onSave,
  onExportZip,
  onOpenPublish,
  onOpenCreateProject,
  onOpenDuplicateProject,
}: BuilderTopbarProps) {
  const saveStatusLabel = saving
    ? 'Salvando...'
    : hasUnsavedChanges
      ? 'Alterações pendentes'
      : formatSavedAt(lastSavedAt);
  const hasCurrentOption = projects.some((entry) => entry.projectId === currentProjectId);
  const projectOptions = hasCurrentOption || !project ? projects : [project, ...projects];
  const [clientSwitchOpen, setClientSwitchOpen] = useState(false);
  const [projectLogoSrc, setProjectLogoSrc] = useState(FALLBACK_PROJECT_LOGO_URL);

  useEffect(() => {
    if (!project?.projectId) {
      setProjectLogoSrc(FALLBACK_PROJECT_LOGO_URL);
      return;
    }
    setProjectLogoSrc(buildProjectLogoUrl(project.projectId));
  }, [project?.projectId]);

  const sortedProjectOptions = useMemo(
    () =>
      [...projectOptions].sort((a, b) => {
        const byName = a.name.localeCompare(b.name, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        });
        if (byName !== 0) {
          return byName;
        }
        return a.projectId.localeCompare(b.projectId, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        });
      }),
    [projectOptions],
  );

  const currentClientLabel = sortedProjectOptions.find(
    (entry) => entry.projectId === currentProjectId,
  )?.name;

  return (
    <header className="z-30 shrink-0 border-b border-[var(--builder-border)] bg-gradient-to-r from-[#020617] via-[#0a132a] to-[#0c172f] px-2.5 py-2">
      <div className="mx-auto flex max-w-[1760px] items-center gap-2.5">
        <div className="min-w-[166px] shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Construtor
          </p>
          <div className="mt-0.5 flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--builder-border)] bg-[rgba(2,6,23,0.65)]">
              <img
                src={projectLogoSrc}
                alt={project?.name ?? 'Cliente'}
                className="h-full w-full object-contain"
                onError={() => {
                  if (projectLogoSrc !== FALLBACK_PROJECT_LOGO_URL) {
                    setProjectLogoSrc(FALLBACK_PROJECT_LOGO_URL);
                  }
                }}
              />
            </span>
            <h1 className="builder-heading min-w-0 truncate text-[clamp(1.05rem,1.8vw,1.3rem)] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
              {project?.name ?? 'Cliente'}
            </h1>
          </div>
        </div>

        <div className="builder-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5">
          <div className="min-w-[240px] shrink-0">
            <Popover
              open={clientSwitchOpen}
              onOpenChange={setClientSwitchOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="builder-focus-ring flex h-10 w-full items-center justify-between rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(7,15,31,0.9)] px-3.5 text-sm font-medium text-[var(--builder-text-primary)]"
                  disabled={loadingProjects || sortedProjectOptions.length === 0}
                >
                  <span className="truncate text-left">
                    {loadingProjects
                      ? 'Carregando clientes...'
                      : currentClientLabel
                        ? currentClientLabel
                        : 'Selecione um cliente'}
                  </span>
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
                    {sortedProjectOptions.map((entry) => (
                      <CommandItem
                        key={entry.projectId}
                        value={`${entry.name} ${entry.projectId}`}
                        className="mx-1 my-0.5 rounded-[10px] px-2 py-2 data-[selected=true]:bg-[rgba(14,165,233,0.2)] data-[selected=true]:text-[var(--builder-text-primary)]"
                        onSelect={() => {
                          onProjectChange(entry.projectId);
                          setClientSwitchOpen(false);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--builder-text-primary)]">
                            {entry.name}
                          </p>
                          <p className="truncate text-xs text-[var(--builder-text-muted)]">
                            {entry.projectId}
                          </p>
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

          <button type="button" className={builderSecondaryButtonClassName} onClick={onOpenCreateProject}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>

          <button
            type="button"
            className={builderSecondaryButtonClassName}
            onClick={onOpenDuplicateProject}
            disabled={!project}
          >
            <Copy className="h-4 w-4" />
            Duplicar cliente
          </button>

          <button
            type="button"
            className={builderPrimaryButtonClassName}
            onClick={onSave}
            disabled={!project || saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando' : 'Salvar'}
          </button>

          <button
            type="button"
            className={cn(builderSecondaryButtonClassName, 'border-[rgba(139,92,246,0.35)] text-[#ddd6fe]')}
            onClick={onExportZip}
            disabled={!project || exportingZip}
          >
            <WandSparkles className="h-4 w-4" />
            {exportingZip ? 'Exportando ZIP...' : 'Exportar ZIP'}
          </button>

          <button
            type="button"
            className={cn(builderSecondaryButtonClassName, 'border-[rgba(14,165,233,0.35)]')}
            onClick={onOpenPublish}
            disabled={!project || publishing}
          >
            <UploadCloud className="h-4 w-4" />
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.65)] px-3 py-1.5 text-xs text-[var(--builder-text-secondary)] xl:flex">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              hasUnsavedChanges ? 'bg-[var(--builder-danger)]' : 'bg-[var(--builder-success)]',
            )}
          />
          <span>{saveStatusLabel}</span>
          {project ? (
            <span className="rounded-full border border-[var(--builder-border)] px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-[var(--builder-text-muted)]">
              {formatProjectStatusLabel(project.status)}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
