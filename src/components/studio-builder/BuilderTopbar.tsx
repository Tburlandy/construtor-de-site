import { ChevronDown, Copy, Plus, Save, UploadCloud, WandSparkles } from 'lucide-react';
import type { ProjectMetadata } from '@/platform/contracts';
import { cn } from '@/lib/utils';
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
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  onProjectChange: (projectId: string) => void;
  onSave: () => void;
  onOpenCreateProject: () => void;
  onOpenDuplicateProject: () => void;
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

export function BuilderTopbar({
  project,
  projects,
  currentProjectId,
  loadingProjects,
  saving,
  hasUnsavedChanges,
  lastSavedAt,
  onProjectChange,
  onSave,
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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--builder-border)] bg-gradient-to-r from-[#020617] via-[#0b1226] to-[#0f172a] px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-[220px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Construtor
          </p>
          <h1 className="builder-heading mt-1 text-[clamp(1.4rem,3vw,2rem)] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
            {project?.name ?? 'Projeto'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="group relative min-w-[220px]">
            <select
              className="builder-focus-ring h-11 w-full appearance-none rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.9)] px-4 pr-10 text-sm font-medium text-[var(--builder-text-primary)]"
              value={currentProjectId}
              onChange={(event) => onProjectChange(event.target.value)}
              disabled={loadingProjects}
            >
              {projectOptions.length === 0 ? (
                <option value={currentProjectId || ''}>Nenhum projeto encontrado</option>
              ) : (
                projectOptions.map((entry) => (
                  <option key={entry.projectId} value={entry.projectId}>
                    {entry.name} ({entry.projectId})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--builder-text-secondary)]" />
          </label>

          <button type="button" className={builderSecondaryButtonClassName} onClick={onOpenCreateProject}>
            <Plus className="h-4 w-4" />
            Novo projeto
          </button>

          <button
            type="button"
            className={builderSecondaryButtonClassName}
            onClick={onOpenDuplicateProject}
            disabled={!project}
          >
            <Copy className="h-4 w-4" />
            Duplicar
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

          <button type="button" className={cn(builderSecondaryButtonClassName, 'border-[rgba(139,92,246,0.35)] text-[#ddd6fe]')}>
            <WandSparkles className="h-4 w-4" />
            Exportar ZIP
          </button>

          <button type="button" className={cn(builderSecondaryButtonClassName, 'border-[rgba(14,165,233,0.35)]')}>
            <UploadCloud className="h-4 w-4" />
            Publicar
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.65)] px-3 py-2 text-xs text-[var(--builder-text-secondary)]">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              hasUnsavedChanges ? 'bg-[var(--builder-danger)]' : 'bg-[var(--builder-success)]',
            )}
          />
          <span>{saveStatusLabel}</span>
          {project ? (
            <span className="rounded-full border border-[var(--builder-border)] px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-[var(--builder-text-muted)]">
              {project.status}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
