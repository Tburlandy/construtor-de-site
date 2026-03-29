import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Content } from '@/content/schema';
import type { ProjectMetadata } from '@/platform/contracts';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BuilderEditorPanel } from '@/components/studio-builder/BuilderEditorPanel';
import { BuilderSidebar } from '@/components/studio-builder/BuilderSidebar';
import { BuilderTopbar } from '@/components/studio-builder/BuilderTopbar';
import { BUILDER_SECTIONS, type BuilderSectionId, type BuilderTabId } from '@/components/studio-builder/builderSections';
import { BuilderPreviewPane } from '@/components/studio-builder/preview/BuilderPreviewPane';
import {
  builderInputClassName,
  builderLabelClassName,
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
  builderTextAreaClassName,
} from '@/components/studio-builder/editors/BuilderEditorFields';
import '@/components/studio-builder/builderTheme.css';

function decodeProjectId(raw?: string): string {
  if (!raw) {
    return '';
  }

  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

export default function StudioProjectShell() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const projectId = useMemo(() => decodeProjectId(projectIdParam), [projectIdParam]);

  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<BuilderSectionId>('global');
  const [activeTab, setActiveTab] = useState<BuilderTabId>('data');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    projectId: '',
    name: '',
    slug: '',
    description: '',
  });

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateForm, setDuplicateForm] = useState({
    targetProjectId: '',
    name: '',
    slug: '',
    description: '',
  });

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('fetch failed');
      }

      const data = (await response.json()) as ProjectMetadata[];
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadProjectWorkspace = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      setNotFound(true);
      setProject(null);
      setContent(null);
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      const [projectResponse, contentResponse] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}`),
        fetch(`/api/projects/${encodeURIComponent(projectId)}/content`),
      ]);

      if (projectResponse.status === 404) {
        setProject(null);
        setContent(null);
        setNotFound(true);
        return;
      }

      if (!projectResponse.ok || !contentResponse.ok) {
        throw new Error('fetch failed');
      }

      const metadata = (await projectResponse.json()) as ProjectMetadata;
      const loadedContent = (await contentResponse.json()) as Content;

      setProject(metadata);
      setContent(loadedContent);
      setHasUnsavedChanges(false);
      setLastSavedAt(metadata.updatedAt);
      setPreviewRefreshSignal((current) => current + 1);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o projeto no builder.',
        variant: 'destructive',
      });
      setProject(null);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadProjectWorkspace();
  }, [loadProjectWorkspace]);

  const handleProjectChange = (nextProjectId: string) => {
    const normalized = nextProjectId.trim();
    if (!normalized || normalized === projectId) {
      return;
    }
    navigate(`/dev/studio/projects/${encodeURIComponent(normalized)}`);
  };

  const handleContentChange = (updater: (current: Content) => Content) => {
    setContent((current) => {
      if (!current) {
        return current;
      }
      const next = updater(current);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (!content || !projectId) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content, null, 2),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Falha ao salvar conteúdo.'));
      }

      const now = new Date().toISOString();
      setHasUnsavedChanges(false);
      setLastSavedAt(now);
      setPreviewRefreshSignal((current) => current + 1);
      toast({
        title: 'Projeto salvo',
        description: `Alterações do projeto ${projectId} persistidas com sucesso.`,
      });
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o projeto.';
      toast({
        title: 'Erro ao salvar',
        description,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    if (!projectId) {
      throw new Error('Projeto inválido');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/upload-image`, {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = getErrorMessage(payload, 'Falha no upload de imagem.');
      toast({
        title: 'Erro no upload',
        description: message,
        variant: 'destructive',
      });
      throw new Error(message);
    }

    const maybeUrl = (payload as { url?: unknown }).url;
    if (typeof maybeUrl !== 'string' || !maybeUrl) {
      throw new Error('Upload sem URL válida.');
    }

    setHasUnsavedChanges(true);
    return maybeUrl;
  };

  const openDuplicateDialog = () => {
    if (!project) {
      return;
    }

    setDuplicateForm({
      targetProjectId: `${project.projectId}-copia`,
      name: `${project.name} (cópia)`,
      slug: `${project.slug}-copia`,
      description: project.description ?? '',
    });
    setDuplicateOpen(true);
  };

  const handleCreateProject = async () => {
    const body = {
      projectId: createForm.projectId.trim(),
      name: createForm.name.trim(),
      slug: createForm.slug.trim(),
      ...(createForm.description.trim() ? { description: createForm.description.trim() } : {}),
    };

    if (!body.projectId || !body.name || !body.slug) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha ID do projeto, nome e slug para criar.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível criar o projeto.'));
      }

      setCreateOpen(false);
      setCreateForm({ projectId: '', name: '', slug: '', description: '' });
      await loadProjects();
      toast({
        title: 'Projeto criado',
        description: body.name,
      });
      navigate(`/dev/studio/projects/${encodeURIComponent(body.projectId)}`);
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : 'Falha de rede ao criar projeto.';
      toast({
        title: 'Erro ao criar',
        description,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateProject = async () => {
    if (!project) {
      return;
    }

    const body = {
      targetProjectId: duplicateForm.targetProjectId.trim(),
      ...(duplicateForm.name.trim() ? { name: duplicateForm.name.trim() } : {}),
      ...(duplicateForm.slug.trim() ? { slug: duplicateForm.slug.trim() } : {}),
      ...(duplicateForm.description.trim() ? { description: duplicateForm.description.trim() } : {}),
    };

    if (!body.targetProjectId) {
      toast({
        title: 'ID obrigatório',
        description: 'Informe o ID do projeto de destino para duplicação.',
        variant: 'destructive',
      });
      return;
    }

    setDuplicating(true);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.projectId)}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível duplicar o projeto.'));
      }

      setDuplicateOpen(false);
      await loadProjects();
      toast({
        title: 'Projeto duplicado',
        description: `Novo projeto: ${body.targetProjectId}`,
      });
      navigate(`/dev/studio/projects/${encodeURIComponent(body.targetProjectId)}`);
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : 'Falha de rede ao duplicar.';
      toast({
        title: 'Erro ao duplicar',
        description,
        variant: 'destructive',
      });
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="studio-builder min-h-screen bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)]">
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--builder-text-secondary)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando builder...
        </div>
      </div>
    );
  }

  if (notFound || !project || !content) {
    return (
      <div className="studio-builder min-h-screen bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)] p-6">
        <div className="mx-auto mt-16 max-w-xl rounded-[var(--builder-radius-card)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.85)] p-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(127,29,29,0.35)]">
            <AlertTriangle className="h-5 w-5 text-[var(--builder-danger)]" />
          </div>
          <h2 className="builder-heading text-2xl font-bold">Projeto não encontrado</h2>
          <p className="mt-2 text-sm text-[var(--builder-text-secondary)]">
            Não foi possível abrir <span className="font-mono">{projectId || '—'}</span> no construtor.
          </p>
          <Link
            to="/dev/studio/projects"
            className="mt-6 inline-flex items-center rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.85)] px-4 py-2 text-sm font-semibold text-[var(--builder-text-primary)] transition hover:bg-[var(--builder-bg-surface-highlight)]"
          >
            Voltar para lista de projetos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-builder min-h-screen bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)]">
      <BuilderTopbar
        project={project}
        projects={projects}
        currentProjectId={project.projectId}
        loadingProjects={loadingProjects}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        onProjectChange={handleProjectChange}
        onSave={() => void handleSave()}
        onOpenCreateProject={() => setCreateOpen(true)}
        onOpenDuplicateProject={openDuplicateDialog}
      />

      <main className="mx-auto flex w-full max-w-[1760px] flex-col gap-4 px-4 py-4 lg:flex-row">
        <BuilderSidebar
          sections={BUILDER_SECTIONS}
          activeSectionId={activeSectionId}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onSectionChange={setActiveSectionId}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row">
          <div className="order-2 min-w-0 lg:order-1 lg:w-[460px] xl:w-[500px]">
            <BuilderEditorPanel
              content={content}
              activeSectionId={activeSectionId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSectionChange={setActiveSectionId}
              onContentChange={handleContentChange}
              onUploadImage={handleUploadImage}
              onRequestPreviewRefresh={() => setPreviewRefreshSignal((current) => current + 1)}
            />
          </div>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <BuilderPreviewPane
              projectId={project.projectId}
              activeSectionId={activeSectionId}
              refreshSignal={previewRefreshSignal}
            />
          </div>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="builder-heading text-xl">Novo projeto</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>ID do projeto</p>
              <input
                className={builderInputClassName}
                value={createForm.projectId}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, projectId: event.target.value }))
                }
                placeholder="ex: cliente-rio-2026"
              />
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Nome</p>
              <input
                className={builderInputClassName}
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nome exibido no topo"
              />
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Slug</p>
              <input
                className={builderInputClassName}
                value={createForm.slug}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, slug: event.target.value }))
                }
                placeholder="cliente-rio"
              />
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Descrição</p>
              <textarea
                className={builderTextAreaClassName}
                rows={3}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={builderPrimaryButtonClassName}
              onClick={() => void handleCreateProject()}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando
                </>
              ) : (
                'Criar projeto'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={duplicateOpen}
        onOpenChange={(nextOpen) => {
          setDuplicateOpen(nextOpen);
          if (!nextOpen) {
            setDuplicateForm({
              targetProjectId: '',
              name: '',
              slug: '',
              description: '',
            });
          }
        }}
      >
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="builder-heading text-xl">Duplicar projeto</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Origem</p>
              <p className="rounded-xl border border-[var(--builder-border)] bg-[rgba(2,6,23,0.6)] px-3 py-2 text-sm text-[var(--builder-text-secondary)]">
                {project.projectId}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>ID de destino</p>
              <input
                className={builderInputClassName}
                value={duplicateForm.targetProjectId}
                onChange={(event) =>
                  setDuplicateForm((current) => ({
                    ...current,
                    targetProjectId: event.target.value,
                  }))
                }
                placeholder="ex: cliente-rio-copia"
              />
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Nome</p>
              <input
                className={builderInputClassName}
                value={duplicateForm.name}
                onChange={(event) =>
                  setDuplicateForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Slug</p>
              <input
                className={builderInputClassName}
                value={duplicateForm.slug}
                onChange={(event) =>
                  setDuplicateForm((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <p className={builderLabelClassName}>Descrição</p>
              <textarea
                className={builderTextAreaClassName}
                rows={3}
                value={duplicateForm.description}
                onChange={(event) =>
                  setDuplicateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => setDuplicateOpen(false)}
              disabled={duplicating}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={builderPrimaryButtonClassName}
              onClick={() => void handleDuplicateProject()}
              disabled={duplicating}
            >
              {duplicating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duplicando
                </>
              ) : (
                'Duplicar projeto'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
