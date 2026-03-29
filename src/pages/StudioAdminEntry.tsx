import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Loader2, PencilLine, Plus, Settings } from 'lucide-react';
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
import {
  builderInputClassName,
  builderLabelClassName,
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
  builderTextAreaClassName,
} from '@/components/studio-builder/editors/BuilderEditorFields';
import '@/components/studio-builder/builderTheme.css';

function normalizeSlug(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'cliente';
}

const FALLBACK_PROJECT_LOGO_URL = 'https://www.efitecsolar.com/assets/images/logo.png';

function buildProjectLogoUrl(projectId: string): string {
  return `/media/projects/${encodeURIComponent(projectId)}/img/logo.webp`;
}

function ProjectLogo({ projectId, name }: { projectId: string; name: string }) {
  const [src, setSrc] = useState(() => buildProjectLogoUrl(projectId));

  useEffect(() => {
    setSrc(buildProjectLogoUrl(projectId));
  }, [projectId]);

  return (
    <div className="inline-flex h-10 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.65)]">
      <img
        src={src}
        alt={name}
        className="h-full w-full object-contain"
        onError={() => {
          if (src !== FALLBACK_PROJECT_LOGO_URL) {
            setSrc(FALLBACK_PROJECT_LOGO_URL);
          }
        }}
      />
    </div>
  );
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

type ClientConfigFormState = {
  name: string;
  gtmId: string;
  webhookUrl: string;
  secondaryWebhookUrl: string;
  formId: string;
  formName: string;
  canalId: string;
};

function createInitialClientConfigForm(name = ''): ClientConfigFormState {
  return {
    name,
    gtmId: '',
    webhookUrl: '',
    secondaryWebhookUrl: '',
    formId: '',
    formName: '',
    canalId: '',
  };
}

async function fetchProjectsWithTimeout(timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch('/api/projects', { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

// ─── Publish config types ───────────────────────────────────────────────────

type PublishProvider = 'ftp' | 'sftp';

type PublishPayload = {
  provider: PublishProvider;
  host: string;
  username: string;
  port?: number;
  password?: string;
  remotePath?: string;
  secure?: boolean;
  privateKey?: string;
  passphrase?: string;
};

type PublishFormState = {
  provider: PublishProvider;
  host: string;
  port: string;
  remotePath: string;
  username: string;
  password: string;
  secure: boolean;
  privateKey: string;
  passphrase: string;
};

function createInitialPublishForm(): PublishFormState {
  return {
    provider: 'ftp',
    host: '',
    port: '',
    remotePath: 'public_html',
    username: '',
    password: '',
    secure: false,
    privateKey: '',
    passphrase: '',
  };
}

function buildPublishPayload(form: PublishFormState): PublishPayload {
  const host = form.host.trim();
  const username = form.username.trim();
  const remotePath = form.remotePath.trim();
  const password = form.password.trim();
  const privateKey = form.privateKey.trim();
  const passphrase = form.passphrase.trim();
  const portRaw = form.port.trim();

  if (!host) throw new Error('Informe o host da hospedagem.');
  if (!username) throw new Error('Informe o usuário de acesso.');

  let parsedPort: number | undefined;
  if (portRaw) {
    const asNumber = Number(portRaw);
    if (!Number.isInteger(asNumber) || asNumber <= 0) throw new Error('Informe uma porta válida.');
    parsedPort = asNumber;
  }

  if (form.provider === 'ftp' && !password) throw new Error('Senha é obrigatória para publicação FTP.');
  if (form.provider === 'sftp' && !password && !privateKey) throw new Error('No SFTP, informe senha ou chave privada.');

  return {
    provider: form.provider,
    host,
    username,
    ...(parsedPort ? { port: parsedPort } : {}),
    ...(remotePath ? { remotePath } : {}),
    ...(password ? { password } : {}),
    ...(form.provider === 'ftp' ? { secure: form.secure } : {}),
    ...(privateKey ? { privateKey } : {}),
    ...(passphrase ? { passphrase } : {}),
  };
}

function publishFormFromPayload(payload: PublishPayload): PublishFormState {
  return {
    provider: payload.provider,
    host: payload.host ?? '',
    port: typeof payload.port === 'number' ? String(payload.port) : '',
    remotePath: payload.remotePath ?? 'public_html',
    username: payload.username ?? '',
    password: payload.password ?? '',
    secure: payload.provider === 'ftp' ? Boolean(payload.secure) : false,
    privateKey: payload.privateKey ?? '',
    passphrase: payload.passphrase ?? '',
  };
}

// ─── Publish status dot ──────────────────────────────────────────────────────

function PublishStatusDot({ configured }: { configured: boolean | null }) {
  if (configured === null) return null;

  if (configured) {
    return (
      <span
        title="Publicação configurada"
        className="relative inline-flex h-2 w-2 shrink-0"
      >
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
          style={{ backgroundColor: '#4ade80' }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{
            backgroundColor: '#4ade80',
            boxShadow:
              '0 0 3px 1px rgba(74,222,128,0.9), 0 0 8px 2px rgba(74,222,128,0.55), 0 0 16px 4px rgba(74,222,128,0.25)',
          }}
        />
      </span>
    );
  }

  return (
    <span
      title="Publicação não configurada"
      className="relative inline-flex h-2 w-2 shrink-0"
    >
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
        style={{ backgroundColor: '#ff2d55', animationDuration: '1.8s' }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{
          backgroundColor: '#ff2d55',
          boxShadow:
            '0 0 3px 1px rgba(255,45,85,0.95), 0 0 8px 2px rgba(255,45,85,0.6), 0 0 16px 4px rgba(255,45,85,0.3)',
        }}
      />
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StudioAdminEntry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // publish config status per project: null = loading/unknown, true/false = result
  const [publishStatus, setPublishStatus] = useState<Record<string, boolean | null>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMetadata | null>(null);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [editForm, setEditForm] = useState<ClientConfigFormState>(createInitialClientConfigForm);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingEditData, setSavingEditData] = useState(false);

  // publish config dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configProject, setConfigProject] = useState<ProjectMetadata | null>(null);
  const [configForm, setConfigForm] = useState<PublishFormState>(createInitialPublishForm);
  const [configSavedAt, setConfigSavedAt] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetchProjectsWithTimeout();
      if (!response.ok) {
        throw new Error('Não foi possível carregar os clientes.');
      }
      const data = (await response.json()) as ProjectMetadata[];
      setProjects(data);
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setLoadError('A API demorou para responder. Tente novamente em alguns segundos.');
        return [];
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Erro ao carregar clientes do construtor.';
      setLoadError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublishStatuses = useCallback(async (projectList: ProjectMetadata[]) => {
    if (projectList.length === 0) return;

    // mark all as loading
    setPublishStatus((current) => {
      const next = { ...current };
      for (const p of projectList) {
        if (!(p.projectId in next)) next[p.projectId] = null;
      }
      return next;
    });

    await Promise.all(
      projectList.map(async (p) => {
        try {
          const response = await fetch(`/api/clients/${encodeURIComponent(p.projectId)}/publish-config`);
          if (response.status === 404) {
            setPublishStatus((s) => ({ ...s, [p.projectId]: false }));
            return;
          }
          if (!response.ok) {
            setPublishStatus((s) => ({ ...s, [p.projectId]: false }));
            return;
          }
          const payload = await response.json().catch(() => ({}));
          const configured =
            payload && typeof payload === 'object' && 'configured' in payload
              ? Boolean(payload.configured)
              : false;
          setPublishStatus((s) => ({ ...s, [p.projectId]: configured }));
        } catch {
          setPublishStatus((s) => ({ ...s, [p.projectId]: false }));
        }
      }),
    );
  }, []);

  useEffect(() => {
    void (async () => {
      const data = await loadProjects();
      if (data && data.length > 0) {
        void fetchPublishStatuses(data);
      }
    })();
  }, [loadProjects, fetchPublishStatuses]);

  const handleCreateProject = async () => {
    const body = {
      name: createForm.name.trim(),
      slug: normalizeSlug(createForm.name.trim()),
    };

    if (!body.name) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome do cliente para criar.',
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
        throw new Error(getErrorMessage(payload, 'Não foi possível criar o cliente.'));
      }

      const savedProject =
        payload && typeof payload === 'object'
          ? (payload as Partial<ProjectMetadata>)
          : null;
      const savedProjectId =
        savedProject && typeof savedProject.projectId === 'string'
          ? savedProject.projectId
          : null;

      if (!savedProjectId) {
        throw new Error('Projeto criado sem projectId retornado pela API.');
      }

      setCreateOpen(false);
      setCreateForm({ name: '' });
      const data = await loadProjects();
      if (data && data.length > 0) void fetchPublishStatuses(data);
      toast({
        title: 'Cliente criado',
        description: body.name,
      });
      navigate(`/cliente/${encodeURIComponent(savedProjectId)}`);
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : 'Falha de rede ao criar cliente.';
      toast({
        title: 'Erro ao criar',
        description,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = async (project: ProjectMetadata) => {
    setEditingProject(project);
    setEditingContent(null);
    setEditForm(createInitialClientConfigForm(project.name));
    setEditOpen(true);
    setLoadingEditData(true);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.projectId)}/content`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível carregar os dados do cliente.'));
      }

      const loadedContent = payload as Content;
      setEditingContent(loadedContent);
      setEditForm({
        name: project.name,
        gtmId: loadedContent.global.gtmId ?? '',
        webhookUrl: loadedContent.global.webhookUrl ?? '',
        secondaryWebhookUrl: loadedContent.global.secondaryWebhookUrl ?? '',
        formId: loadedContent.global.formId ?? '',
        formName: loadedContent.global.formName ?? '',
        canalId: loadedContent.global.canalId ?? '',
      });
    } catch (error) {
      toast({
        title: 'Erro ao carregar cliente',
        description:
          error instanceof Error && error.message
            ? error.message
            : 'Falha ao carregar dados para edição.',
        variant: 'destructive',
      });
      setEditOpen(false);
      setEditingProject(null);
      setEditingContent(null);
    } finally {
      setLoadingEditData(false);
    }
  };

  const handleSaveClientConfig = async () => {
    if (!editingProject || !editingContent) return;

    const name = editForm.name.trim();
    if (!name) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome do cliente para salvar.',
        variant: 'destructive',
      });
      return;
    }

    setSavingEditData(true);
    try {
      const updatedContent: Content = {
        ...editingContent,
        global: {
          ...editingContent.global,
          ...(editForm.gtmId.trim() ? { gtmId: editForm.gtmId.trim() } : {}),
          ...(editForm.webhookUrl.trim() ? { webhookUrl: editForm.webhookUrl.trim() } : {}),
          ...(editForm.secondaryWebhookUrl.trim()
            ? { secondaryWebhookUrl: editForm.secondaryWebhookUrl.trim() }
            : {}),
          ...(editForm.formId.trim() ? { formId: editForm.formId.trim() } : {}),
          ...(editForm.formName.trim() ? { formName: editForm.formName.trim() } : {}),
          ...(editForm.canalId.trim() ? { canalId: editForm.canalId.trim() } : {}),
        },
      };

      if (editingContent.global.gtmId && !editForm.gtmId.trim()) {
        delete updatedContent.global.gtmId;
      }
      if (editingContent.global.webhookUrl && !editForm.webhookUrl.trim()) {
        delete updatedContent.global.webhookUrl;
      }
      if (editingContent.global.secondaryWebhookUrl && !editForm.secondaryWebhookUrl.trim()) {
        delete updatedContent.global.secondaryWebhookUrl;
      }
      if (editingContent.global.formId && !editForm.formId.trim()) {
        delete updatedContent.global.formId;
      }
      if (editingContent.global.formName && !editForm.formName.trim()) {
        delete updatedContent.global.formName;
      }
      if (editingContent.global.canalId && !editForm.canalId.trim()) {
        delete updatedContent.global.canalId;
      }

      const [projectResponse, contentResponse] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(editingProject.projectId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
        fetch(`/api/projects/${encodeURIComponent(editingProject.projectId)}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedContent),
        }),
      ]);

      const projectPayload = await projectResponse.json().catch(() => ({}));
      const contentPayload = await contentResponse.json().catch(() => ({}));
      if (!projectResponse.ok) {
        throw new Error(getErrorMessage(projectPayload, 'Não foi possível atualizar os dados do cliente.'));
      }
      if (!contentResponse.ok) {
        throw new Error(getErrorMessage(contentPayload, 'Não foi possível atualizar as integrações do cliente.'));
      }

      const updatedProject = projectPayload as ProjectMetadata;
      setProjects((current) =>
        current.map((item) => (item.projectId === updatedProject.projectId ? updatedProject : item)),
      );
      setEditOpen(false);
      setEditingProject(null);
      setEditingContent(null);
      setEditForm(createInitialClientConfigForm());
      toast({
        title: 'Cliente atualizado',
        description: updatedProject.name,
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description:
          error instanceof Error && error.message ? error.message : 'Falha de rede ao atualizar cliente.',
        variant: 'destructive',
      });
    } finally {
      setSavingEditData(false);
    }
  };

  // ─── Publish config dialog handlers ───────────────────────────────────────

  const openConfigDialog = async (project: ProjectMetadata) => {
    setConfigProject(project);
    setConfigForm(createInitialPublishForm());
    setConfigSavedAt(null);
    setConfigOpen(true);
    setLoadingConfig(true);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(project.projectId)}/publish-config`);
      if (response.status === 404) return;
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      const configured =
        payload && typeof payload === 'object' && 'configured' in payload
          ? Boolean(payload.configured)
          : false;
      if (!configured) return;
      const connection =
        payload && typeof payload === 'object' && 'connection' in payload && payload.connection
          ? (payload.connection as PublishPayload)
          : null;
      if (!connection) return;
      setConfigForm(publishFormFromPayload(connection));
      setConfigSavedAt(
        payload && typeof payload === 'object' && 'updatedAt' in payload && typeof payload.updatedAt === 'string'
          ? payload.updatedAt
          : null,
      );
    } catch {
      // leave form empty
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configProject) return;

    let payload: PublishPayload;
    try {
      payload = buildPublishPayload(configForm);
    } catch (error) {
      toast({
        title: 'Dados incompletos',
        description: error instanceof Error ? error.message : 'Revise os dados de conexão.',
        variant: 'destructive',
      });
      return;
    }

    setSavingConfig(true);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(configProject.projectId)}/publish-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(result, 'Não foi possível salvar a configuração de publicação.'));
      }

      const savedConnection =
        result && typeof result === 'object' && 'connection' in result && result.connection
          ? (result.connection as PublishPayload)
          : payload;

      setConfigForm(publishFormFromPayload(savedConnection));
      setConfigSavedAt(
        result && typeof result === 'object' && 'updatedAt' in result && typeof result.updatedAt === 'string'
          ? result.updatedAt
          : new Date().toISOString(),
      );
      setPublishStatus((s) => ({ ...s, [configProject.projectId]: true }));
      toast({ title: 'Configuração salva', description: configProject.name });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Falha ao salvar configuração.',
        variant: 'destructive',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!configProject) return;

    let payload: PublishPayload;
    try {
      payload = buildPublishPayload(configForm);
    } catch (error) {
      toast({
        title: 'Dados incompletos',
        description: error instanceof Error ? error.message : 'Revise os dados de conexão.',
        variant: 'destructive',
      });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(configProject.projectId)}/deploy/test-connection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(result, 'Conexão falhou.'));
      }
      toast({ title: 'Conexão OK', description: 'Hospedagem acessível.' });
    } catch (error) {
      toast({
        title: 'Falha na conexão',
        description: error instanceof Error ? error.message : 'Não foi possível conectar.',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const isBusy = loadingConfig || savingConfig || testingConnection;

  return (
    <div className="studio-builder min-h-screen bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="builder-surface w-full p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Construtor
          </p>
          <h1 className="builder-heading mt-2 text-[clamp(1.8rem,3vw,2.3rem)] font-bold leading-[1.1]">
            Clientes
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--builder-text-muted)]">
              Base de clientes
            </p>
            <button
              type="button"
              className={builderPrimaryButtonClassName}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo cliente
            </button>
          </div>

          {loading ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.8)] px-4 py-2 text-sm text-[var(--builder-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando clientes...
            </div>
          ) : loadError ? (
            <div className="mt-6 rounded-[14px] border border-[rgba(248,113,113,0.4)] bg-[var(--builder-danger-surface)] p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--builder-danger)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--builder-text-primary)]">Erro no carregamento</p>
                  <p className="mt-1 text-sm text-[var(--builder-text-secondary)]">{loadError}</p>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 inline-flex items-center rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.7)] px-4 py-2 text-sm font-semibold text-[var(--builder-text-primary)] transition hover:bg-[var(--builder-bg-surface-highlight)]"
                onClick={() => void loadProjects()}
              >
                Tentar novamente
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="mt-6 rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.65)] p-4">
              <p className="text-sm text-[var(--builder-text-secondary)]">
                Não há clientes cadastrados ainda.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {projects.map((item) => {
                const pubStatus = publishStatus[item.projectId] ?? null;
                return (
                  <div
                    key={item.projectId}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/cliente/${encodeURIComponent(item.projectId)}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/cliente/${encodeURIComponent(item.projectId)}`);
                      }
                    }}
                    className="flex cursor-pointer flex-col rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.62)] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PublishStatusDot configured={pubStatus} />
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--builder-text-muted)]">
                          {item.slug}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="rounded-[8px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.7)] p-1.5 text-[var(--builder-text-secondary)] transition hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openConfigDialog(item);
                          }}
                          title="Configurar publicação"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-[8px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.7)] p-1.5 text-[var(--builder-text-secondary)] transition hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openEditDialog(item);
                          }}
                          title="Editar cliente"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <ProjectLogo projectId={item.projectId} name={item.name} />
                      <h2 className="text-lg font-semibold text-[var(--builder-text-primary)]">
                        {item.name}
                      </h2>
                    </div>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--builder-text-secondary)]">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.7)] px-3 py-1.5 text-sm font-semibold text-[var(--builder-text-primary)] transition hover:bg-[var(--builder-bg-surface-highlight)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/cliente/${encodeURIComponent(item.projectId)}`);
                        }}
                      >
                        Abrir cliente
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create client dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] sm:max-w-md">
          <div className="studio-builder bg-transparent">
            <DialogHeader>
              <DialogTitle className="builder-heading text-xl text-[var(--builder-text-primary)]">Novo cliente</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <p className={builderLabelClassName}>Nome</p>
                <input
                  className={builderInputClassName}
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ex.: Solar Rio"
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
                  'Criar cliente'
                )}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit name dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen);
          if (!nextOpen) {
            setEditingProject(null);
            setEditingContent(null);
            setEditForm(createInitialClientConfigForm());
            setLoadingEditData(false);
          }
        }}
      >
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] sm:max-w-md">
          <div className="studio-builder bg-transparent">
            <DialogHeader>
              <DialogTitle className="builder-heading text-xl text-[var(--builder-text-primary)]">Editar cliente</DialogTitle>
            </DialogHeader>
            {loadingEditData ? (
              <div className="flex items-center gap-2 py-6 text-sm text-[var(--builder-text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando dados do cliente...
              </div>
            ) : (
              <div className="grid gap-3 py-2">
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Nome</p>
                  <input
                    className={builderInputClassName}
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Nome exibido no Builder"
                    disabled={savingEditData}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Google Tag Manager ID</p>
                  <input
                    className={builderInputClassName}
                    value={editForm.gtmId}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, gtmId: event.target.value }))
                    }
                    placeholder="GTM-XXXXXXX"
                    disabled={savingEditData}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Webhook principal</p>
                  <input
                    className={builderInputClassName}
                    value={editForm.webhookUrl}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, webhookUrl: event.target.value }))
                    }
                    placeholder="https://..."
                    disabled={savingEditData}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Webhook secundário</p>
                  <input
                    className={builderInputClassName}
                    value={editForm.secondaryWebhookUrl}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, secondaryWebhookUrl: event.target.value }))
                    }
                    placeholder="https://..."
                    disabled={savingEditData}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Form ID</p>
                    <input
                      className={builderInputClassName}
                      value={editForm.formId}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, formId: event.target.value }))
                      }
                      disabled={savingEditData}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Form Name</p>
                    <input
                      className={builderInputClassName}
                      value={editForm.formName}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, formName: event.target.value }))
                      }
                      disabled={savingEditData}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Canal ID</p>
                    <input
                      className={builderInputClassName}
                      value={editForm.canalId}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, canalId: event.target.value }))
                      }
                      disabled={savingEditData}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <button
                type="button"
                className={builderSecondaryButtonClassName}
                onClick={() => setEditOpen(false)}
                disabled={savingEditData || loadingEditData}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={builderPrimaryButtonClassName}
                onClick={() => void handleSaveClientConfig()}
                disabled={savingEditData || loadingEditData}
              >
                {savingEditData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Publish config dialog ────────────────────────────────────────── */}
      <Dialog
        open={configOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isBusy) {
            setConfigOpen(false);
            setConfigProject(null);
          }
        }}
      >
        <DialogContent className="studio-builder border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="builder-heading text-xl text-[var(--builder-text-primary)]">
              Publicação — {configProject?.name ?? ''}
            </DialogTitle>
          </DialogHeader>

          {loadingConfig ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[var(--builder-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando configuração...
            </div>
          ) : (
            <div className="grid gap-3 py-1">
              {configSavedAt ? (
                <p className="text-xs text-[var(--builder-text-muted)]">
                  Última atualização: {new Date(configSavedAt).toLocaleString('pt-BR')}
                </p>
              ) : null}

              <div className="space-y-1.5">
                <p className={builderLabelClassName}>Provedor</p>
                <select
                  className={builderInputClassName}
                  value={configForm.provider}
                  onChange={(e) =>
                    setConfigForm((c) => ({ ...c, provider: e.target.value as PublishProvider }))
                  }
                  disabled={isBusy}
                >
                  <option value="ftp">FTP</option>
                  <option value="sftp">SFTP</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <p className={builderLabelClassName}>Host</p>
                  <input
                    className={builderInputClassName}
                    value={configForm.host}
                    onChange={(e) => setConfigForm((c) => ({ ...c, host: e.target.value }))}
                    placeholder="ftp.seu-dominio.com"
                    disabled={isBusy}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Porta</p>
                  <input
                    className={builderInputClassName}
                    value={configForm.port}
                    onChange={(e) => setConfigForm((c) => ({ ...c, port: e.target.value }))}
                    placeholder={configForm.provider === 'ftp' ? '21' : '22'}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className={builderLabelClassName}>Caminho remoto</p>
                <input
                  className={builderInputClassName}
                  value={configForm.remotePath}
                  onChange={(e) => setConfigForm((c) => ({ ...c, remotePath: e.target.value }))}
                  placeholder="public_html"
                  disabled={isBusy}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Usuário</p>
                  <input
                    className={builderInputClassName}
                    value={configForm.username}
                    onChange={(e) => setConfigForm((c) => ({ ...c, username: e.target.value }))}
                    placeholder="usuario_ftp"
                    disabled={isBusy}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Senha</p>
                  <input
                    type="password"
                    className={builderInputClassName}
                    value={configForm.password}
                    onChange={(e) => setConfigForm((c) => ({ ...c, password: e.target.value }))}
                    placeholder="••••••••"
                    disabled={isBusy}
                  />
                </div>
              </div>

              {configForm.provider === 'sftp' ? (
                <>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Chave privada (opcional)</p>
                    <textarea
                      className={builderTextAreaClassName}
                      rows={4}
                      value={configForm.privateKey}
                      onChange={(e) => setConfigForm((c) => ({ ...c, privateKey: e.target.value }))}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      disabled={isBusy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Passphrase da chave (opcional)</p>
                    <input
                      type="password"
                      className={builderInputClassName}
                      value={configForm.passphrase}
                      onChange={(e) => setConfigForm((c) => ({ ...c, passphrase: e.target.value }))}
                      placeholder="Se a chave exigir"
                      disabled={isBusy}
                    />
                  </div>
                </>
              ) : (
                <label className="inline-flex items-center gap-2 text-sm text-[var(--builder-text-secondary)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-[var(--builder-border)] bg-[rgba(2,6,23,0.65)]"
                    checked={configForm.secure}
                    onChange={(e) => setConfigForm((c) => ({ ...c, secure: e.target.checked }))}
                    disabled={isBusy}
                  />
                  Usar FTPS (FTP seguro)
                </label>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => {
                setConfigOpen(false);
                setConfigProject(null);
              }}
              disabled={isBusy}
            >
              Fechar
            </button>
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => void handleTestConnection()}
              disabled={isBusy}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testando
                </>
              ) : (
                'Testar conexão'
              )}
            </button>
            <button
              type="button"
              className={builderPrimaryButtonClassName}
              onClick={() => void handleSaveConfig()}
              disabled={isBusy}
            >
              {savingConfig ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                'Salvar configuração'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
