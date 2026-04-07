import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, LayoutTemplate, Plus, Save, UploadCloud, WandSparkles } from 'lucide-react';
import type { ProjectListItemWithContentLogo, ProjectMetadata } from '@/platform/contracts';
import {
  FALLBACK_STUDIO_PROJECT_LOGO_URL,
  resolveStudioProjectLogoSrc,
} from '@/lib/studioProjectLogo';
import { cn } from '@/lib/utils';
import { BuilderClientSwitcher } from './BuilderClientSwitcher';
import {
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
} from './editors/BuilderEditorFields';

interface BuilderTopbarProps {
  project: ProjectMetadata | null;
  projects: ProjectListItemWithContentLogo[];
  /** Logo do site (`content.global.logo`), alinhada ao preview e à listagem de clientes. */
  contentGlobalLogo?: string | null;
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
  contentGlobalLogo,
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
  const [projectLogoSrc, setProjectLogoSrc] = useState(FALLBACK_STUDIO_PROJECT_LOGO_URL);

  useEffect(() => {
    if (!project?.projectId) {
      setProjectLogoSrc(FALLBACK_STUDIO_PROJECT_LOGO_URL);
      return;
    }
    setProjectLogoSrc(
      resolveStudioProjectLogoSrc({
        projectId: project.projectId,
        contentLogoUrl: contentGlobalLogo,
      }),
    );
  }, [project?.projectId, contentGlobalLogo]);

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
                  if (projectLogoSrc !== FALLBACK_STUDIO_PROJECT_LOGO_URL) {
                    setProjectLogoSrc(FALLBACK_STUDIO_PROJECT_LOGO_URL);
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
          <BuilderClientSwitcher
            projects={projectOptions}
            loadingProjects={loadingProjects}
            currentProjectId={currentProjectId}
            onSelect={onProjectChange}
          />

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

          <Link
            to="/construtor/template-base/style-1"
            className={cn(
              builderSecondaryButtonClassName,
              'border-[rgba(245,158,11,0.35)] text-amber-100 no-underline',
            )}
          >
            <LayoutTemplate className="h-4 w-4" />
            Template base
          </Link>
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
