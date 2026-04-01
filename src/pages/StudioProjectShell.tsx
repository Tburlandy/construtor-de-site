import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Content } from '@/content/schema';
import type { ProjectListItemWithContentLogo, ProjectMetadata } from '@/platform/contracts';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BuilderEditorPanel } from '@/components/studio-builder/BuilderEditorPanel';
import {
  BuilderImageField,
  BuilderImageLayoutControls,
  builderInputClassName,
  builderLabelClassName,
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
  builderTextAreaClassName,
} from '@/components/studio-builder/editors/BuilderEditorFields';
import {
  BuilderHistoryPanel,
  type BuilderContentVersionSummary,
} from '@/components/studio-builder/BuilderHistoryPanel';
import {
  BuilderSidebar,
  type BuilderSidebarModuleId,
} from '@/components/studio-builder/BuilderSidebar';
import { BuilderTopbar } from '@/components/studio-builder/BuilderTopbar';
import { BUILDER_SECTIONS, type BuilderSectionId, type BuilderTabId } from '@/components/studio-builder/builderSections';
import { BuilderPreviewPane } from '@/components/studio-builder/preview/BuilderPreviewPane';
import { normalizeLogoImageLayout } from '@/lib/imageLayout';
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

function buildPublishPayload(form: PublishFormState) {
  const host = form.host.trim();
  const username = form.username.trim();
  const remotePath = form.remotePath.trim();
  const password = form.password.trim();
  const privateKey = form.privateKey.trim();
  const passphrase = form.passphrase.trim();
  const portRaw = form.port.trim();

  if (!host) {
    throw new Error('Informe o host da hospedagem.');
  }
  if (!username) {
    throw new Error('Informe o usuário de acesso.');
  }

  let parsedPort: number | undefined;
  if (portRaw) {
    const asNumber = Number(portRaw);
    if (!Number.isInteger(asNumber) || asNumber <= 0) {
      throw new Error('Informe uma porta válida.');
    }
    parsedPort = asNumber;
  }

  if (form.provider === 'ftp' && !password) {
    throw new Error('Senha é obrigatória para publicação FTP.');
  }

  if (form.provider === 'sftp' && !password && !privateKey) {
    throw new Error('No SFTP, informe senha ou chave privada.');
  }

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

export default function StudioProjectShell() {
  const { projectId: projectIdParam, clientId: clientIdParam } = useParams<{
    projectId?: string;
    clientId?: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const projectId = useMemo(
    () => decodeProjectId(clientIdParam ?? projectIdParam),
    [clientIdParam, projectIdParam],
  );

  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [projects, setProjects] = useState<ProjectListItemWithContentLogo[]>([]);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<BuilderSectionId>('global');
  const [activeTab, setActiveTab] = useState<BuilderTabId>('data');
  const [activeModuleId, setActiveModuleId] = useState<BuilderSidebarModuleId>('builder');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);
  const [editorScrollToTopSignal, setEditorScrollToTopSignal] = useState(0);
  const [versions, setVersions] = useState<BuilderContentVersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
  });

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateForm, setDuplicateForm] = useState({
    targetProjectId: '',
    name: '',
    description: '',
  });
  const [publishOpen, setPublishOpen] = useState(false);
  const [testingPublishConnection, setTestingPublishConnection] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingPublishConfig, setLoadingPublishConfig] = useState(false);
  const [savingPublishConfig, setSavingPublishConfig] = useState(false);
  const [savedPublishConfig, setSavedPublishConfig] = useState<PublishPayload | null>(null);
  const [publishConfigUpdatedAt, setPublishConfigUpdatedAt] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState<PublishFormState>(createInitialPublishForm);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('fetch failed');
      }

      const data = (await response.json()) as ProjectListItemWithContentLogo[];
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadVersions = useCallback(async () => {
    if (!projectId) {
      setVersions([]);
      return;
    }

    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/versions`);
      if (!response.ok) {
        throw new Error('fetch failed');
      }
      const data = (await response.json()) as BuilderContentVersionSummary[];
      setVersions(data);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, [projectId]);

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
        description: 'Não foi possível carregar o cliente no builder.',
        variant: 'destructive',
      });
      setProject(null);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const loadPublishConfig = useCallback(async () => {
    if (!projectId) {
      setSavedPublishConfig(null);
      setPublishConfigUpdatedAt(null);
      setPublishForm(createInitialPublishForm());
      return;
    }

    setLoadingPublishConfig(true);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(projectId)}/publish-config`);
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404) {
        setSavedPublishConfig(null);
        setPublishConfigUpdatedAt(null);
        setPublishForm(createInitialPublishForm());
        return;
      }
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, 'Não foi possível carregar a configuração de publicação.'),
        );
      }

      const configured =
        payload && typeof payload === 'object' && 'configured' in payload
          ? Boolean(payload.configured)
          : false;

      if (!configured) {
        setSavedPublishConfig(null);
        setPublishConfigUpdatedAt(null);
        setPublishForm(createInitialPublishForm());
        return;
      }

      const connectionCandidate =
        payload &&
        typeof payload === 'object' &&
        'connection' in payload &&
        payload.connection &&
        typeof payload.connection === 'object'
          ? (payload.connection as PublishPayload)
          : null;

      if (!connectionCandidate) {
        setSavedPublishConfig(null);
        setPublishConfigUpdatedAt(null);
        setPublishForm(createInitialPublishForm());
        return;
      }

      setSavedPublishConfig(connectionCandidate);
      setPublishForm(publishFormFromPayload(connectionCandidate));
      setPublishConfigUpdatedAt(
        payload && typeof payload === 'object' && 'updatedAt' in payload && typeof payload.updatedAt === 'string'
          ? payload.updatedAt
          : null,
      );
    } catch (error) {
      setSavedPublishConfig(null);
      setPublishConfigUpdatedAt(null);
      setPublishForm(createInitialPublishForm());
      toast({
        title: 'Erro ao carregar publicação',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a configuração de publicação.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPublishConfig(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadProjectWorkspace();
  }, [loadProjectWorkspace]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  useEffect(() => {
    void loadPublishConfig();
  }, [loadPublishConfig]);

  const handleProjectChange = (nextProjectId: string) => {
    const normalized = nextProjectId.trim();
    if (!normalized || normalized === projectId) {
      return;
    }
    navigate(`/cliente/${encodeURIComponent(normalized)}`);
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

  const handleSave = useCallback(async () => {
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
      void loadVersions();
      toast({
        title: 'Cliente salvo',
        description: `Alterações do cliente ${projectId} persistidas com sucesso.`,
      });
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o cliente.';
      toast({
        title: 'Erro ao salvar',
        description,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [content, loadVersions, projectId, toast]);

  const handleUploadImage = async (file: File): Promise<string> => {
    if (!projectId) {
      throw new Error('Cliente inválido');
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
      description: project.description ?? '',
    });
    setDuplicateOpen(true);
  };

  const handleCreateProject = async () => {
    const body = {
      name: createForm.name.trim(),
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
      await loadProjects();
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

  const handleDuplicateProject = async () => {
    if (!project) {
      return;
    }

    const body = {
      targetProjectId: duplicateForm.targetProjectId.trim(),
      ...(duplicateForm.name.trim() ? { name: duplicateForm.name.trim() } : {}),
      ...(duplicateForm.description.trim() ? { description: duplicateForm.description.trim() } : {}),
    };

    if (!body.targetProjectId) {
      toast({
        title: 'ID obrigatório',
        description: 'Informe o ID do cliente de destino para duplicação.',
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
        throw new Error(getErrorMessage(payload, 'Não foi possível duplicar o cliente.'));
      }

      setDuplicateOpen(false);
      await loadProjects();
      toast({
        title: 'Cliente duplicado',
        description: `Novo cliente: ${body.targetProjectId}`,
      });
      navigate(`/cliente/${encodeURIComponent(body.targetProjectId)}`);
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

  const handleExportZip = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setExportingZip(true);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(projectId)}/export-zip`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível exportar ZIP do cliente.'));
      }

      const zipInfo = (payload as { zip?: { downloadUrl?: unknown } }).zip;
      const queuedJob = (payload as { job?: { jobId?: unknown; status?: unknown } }).job;

      let downloadUrlRaw =
        typeof zipInfo?.downloadUrl === 'string' && zipInfo.downloadUrl.trim()
          ? zipInfo.downloadUrl
          : null;

      if (!downloadUrlRaw && typeof queuedJob?.jobId === 'string' && queuedJob.jobId.trim()) {
        const jobId = queuedJob.jobId;
        const pollTimeoutMs = 6 * 60 * 1000;
        const pollIntervalMs = 2500;
        const startTime = Date.now();

        while (Date.now() - startTime < pollTimeoutMs) {
          const statusResponse = await fetch(
            `/api/clients/${encodeURIComponent(projectId)}/export-jobs/${encodeURIComponent(jobId)}`,
          );
          const statusPayload = await statusResponse.json().catch(() => ({}));
          if (!statusResponse.ok) {
            throw new Error(
              getErrorMessage(statusPayload, 'Não foi possível acompanhar o status da exportação.'),
            );
          }

          const status = (statusPayload as { status?: unknown }).status;
          const statusDownloadUrl = (statusPayload as { downloadUrl?: unknown }).downloadUrl;
          if (
            status === 'success' &&
            typeof statusDownloadUrl === 'string' &&
            statusDownloadUrl.trim()
          ) {
            downloadUrlRaw = statusDownloadUrl;
            break;
          }
          if (status === 'failed') {
            throw new Error(
              getErrorMessage(statusPayload, 'Falha ao processar a exportação do cliente.'),
            );
          }

          await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
        }
      }

      if (typeof downloadUrlRaw !== 'string' || !downloadUrlRaw.trim()) {
        throw new Error('A exportação foi iniciada, mas o arquivo ainda não ficou disponível.');
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrlRaw;
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      toast({
        title: 'ZIP exportado',
        description: `O download do cliente ${projectId} foi iniciado.`,
      });
    } catch (error) {
      const description =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível exportar o ZIP do cliente.';
      toast({
        title: 'Erro ao exportar',
        description,
        variant: 'destructive',
      });
    } finally {
      setExportingZip(false);
    }
  }, [projectId, toast]);

  const executeTestPublishConnection = useCallback(
    async (payload: PublishPayload) => {
      if (!projectId) {
        return;
      }

      setTestingPublishConnection(true);
      try {
        const response = await fetch(
          `/api/clients/${encodeURIComponent(projectId)}/deploy/test-connection`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getErrorMessage(result, 'Não foi possível validar a conexão.'));
        }

        const message =
          result &&
          typeof result === 'object' &&
          'message' in result &&
          typeof result.message === 'string'
            ? result.message
            : 'Conexão validada com sucesso.';

        toast({
          title: 'Conexão validada',
          description: message,
        });
      } catch (error) {
        toast({
          title: 'Falha na conexão',
          description: error instanceof Error ? error.message : 'Não foi possível validar a conexão.',
          variant: 'destructive',
        });
      } finally {
        setTestingPublishConnection(false);
      }
    },
    [projectId, toast],
  );

  const executePublish = useCallback(
    async (payload?: PublishPayload) => {
      if (!projectId) {
        return;
      }

      setPublishing(true);
      try {
        const response = await fetch(`/api/clients/${encodeURIComponent(projectId)}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(payload ? { body: JSON.stringify(payload) } : {}),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getErrorMessage(result, 'Não foi possível publicar o cliente.'));
        }

        const publicationMessage =
          result &&
          typeof result === 'object' &&
          'publication' in result &&
          result.publication &&
          typeof result.publication === 'object' &&
          'message' in result.publication &&
          typeof result.publication.message === 'string'
            ? result.publication.message
            : `Publicação do cliente ${projectId} concluída.`;

        toast({
          title: 'Cliente publicado',
          description: publicationMessage,
        });
        setPublishOpen(false);
      } catch (error) {
        toast({
          title: 'Falha na publicação',
          description: error instanceof Error ? error.message : 'Não foi possível publicar o cliente.',
          variant: 'destructive',
        });
      } finally {
        setPublishing(false);
      }
    },
    [projectId, toast],
  );

  const handleTestPublishConnection = useCallback(async () => {
    let payload: PublishPayload;
    try {
      payload = buildPublishPayload(publishForm);
    } catch (error) {
      toast({
        title: 'Dados incompletos',
        description: error instanceof Error ? error.message : 'Revise os dados de conexão.',
        variant: 'destructive',
      });
      return;
    }

    await executeTestPublishConnection(payload);
  }, [executeTestPublishConnection, publishForm, toast]);

  const handlePublishFromForm = useCallback(async () => {
    let payload: PublishPayload;
    try {
      payload = buildPublishPayload(publishForm);
    } catch (error) {
      toast({
        title: 'Dados incompletos',
        description: error instanceof Error ? error.message : 'Revise os dados de conexão.',
        variant: 'destructive',
      });
      return;
    }

    await executePublish(payload);
  }, [executePublish, publishForm, toast]);

  const handleSavePublishConfig = useCallback(async () => {
    if (!projectId) {
      return;
    }

    let payload: PublishPayload;
    try {
      payload = buildPublishPayload(publishForm);
    } catch (error) {
      toast({
        title: 'Dados incompletos',
        description: error instanceof Error ? error.message : 'Revise os dados de conexão.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPublishConfig(true);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(projectId)}/publish-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(result, 'Não foi possível salvar a configuração de publicação.'));
      }

      const savedConnection =
        result &&
        typeof result === 'object' &&
        'connection' in result &&
        result.connection &&
        typeof result.connection === 'object'
          ? (result.connection as PublishPayload)
          : payload;

      setSavedPublishConfig(savedConnection);
      setPublishForm(publishFormFromPayload(savedConnection));
      setPublishConfigUpdatedAt(
        result && typeof result === 'object' && 'updatedAt' in result && typeof result.updatedAt === 'string'
          ? result.updatedAt
          : new Date().toISOString(),
      );

      toast({
        title: 'Configuração salva',
        description: `Publicação direta configurada para o cliente ${projectId}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar configuração',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a configuração de publicação.',
        variant: 'destructive',
      });
    } finally {
      setSavingPublishConfig(false);
    }
  }, [projectId, publishForm, toast]);

  const handleTopbarPublish = useCallback(async () => {
    if (!projectId) {
      return;
    }
    if (loadingPublishConfig || publishing || testingPublishConnection) {
      return;
    }

    if (!savedPublishConfig) {
      setPublishOpen(true);
      return;
    }

    await executePublish();
  }, [
    executePublish,
    loadingPublishConfig,
    publishing,
    projectId,
    savedPublishConfig,
    testingPublishConnection,
  ]);

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!projectId) {
        return;
      }

      const confirmed = window.confirm(
        'Recuperar esta versão vai substituir o conteúdo atual do cliente. Deseja continuar?',
      );
      if (!confirmed) {
        return;
      }

      setRestoringVersionId(versionId);
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/restore`,
          {
            method: 'POST',
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, 'Não foi possível recuperar a versão.'));
        }

        setContent(payload as Content);
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date().toISOString());
        setPreviewRefreshSignal((current) => current + 1);
        setActiveModuleId('builder');
        void loadVersions();
        toast({
          title: 'Versão recuperada',
          description: `A edição agora está baseada na versão ${versionId}.`,
        });
      } catch (error) {
        const description =
          error instanceof Error && error.message
            ? error.message
            : 'Não foi possível recuperar a versão.';
        toast({
          title: 'Erro ao recuperar',
          description,
          variant: 'destructive',
        });
      } finally {
        setRestoringVersionId(null);
      }
    },
    [loadVersions, projectId, toast],
  );

  const bumpEditorScrollToTop = useCallback(() => {
    setEditorScrollToTopSignal((current) => current + 1);
  }, []);

  const handleSidebarSectionChange = useCallback(
    (sectionId: BuilderSectionId) => {
      setActiveModuleId('builder');
      setActiveTab('data');
      setActiveSectionId(sectionId);
      bumpEditorScrollToTop();
    },
    [bumpEditorScrollToTop],
  );

  const handlePreviewSectionChange = useCallback(
    (sectionId: BuilderSectionId) => {
      setActiveModuleId('builder');
      setActiveTab('data');
      setActiveSectionId(sectionId);
      bumpEditorScrollToTop();
    },
    [bumpEditorScrollToTop],
  );

  const handleSidebarModuleChange = useCallback(
    (moduleId: BuilderSidebarModuleId) => {
      setActiveModuleId(moduleId);

      if (moduleId === 'builder') {
        setActiveTab('data');
        bumpEditorScrollToTop();
        return;
      }

      if (moduleId === 'history') {
        return;
      }

      if (moduleId === 'clientSettings') {
        return;
      }

      if (moduleId === 'publish') {
        setPublishOpen(true);
        return;
      }
    },
    [bumpEditorScrollToTop],
  );

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
          <h2 className="builder-heading text-2xl font-bold">Cliente não encontrado</h2>
          <p className="mt-2 text-sm text-[var(--builder-text-secondary)]">
            Não foi possível abrir <span className="font-mono">{projectId || '—'}</span> no cliente.
          </p>
          <Link
            to="/construtor"
            className="mt-6 inline-flex items-center rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.85)] px-4 py-2 text-sm font-semibold text-[var(--builder-text-primary)] transition hover:bg-[var(--builder-bg-surface-highlight)]"
          >
            Voltar para lista de clientes
          </Link>
        </div>
      </div>
    );
  }

  const logoLayoutControlValue = normalizeLogoImageLayout(content.imageLayout?.logo);

  return (
    <div className="studio-builder flex h-screen flex-col overflow-hidden bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)]">
      <BuilderTopbar
        project={project}
        projects={projects}
        contentGlobalLogo={content.global.logo}
        currentProjectId={project.projectId}
        loadingProjects={loadingProjects}
        saving={saving}
        exportingZip={exportingZip}
        publishing={publishing || testingPublishConnection || loadingPublishConfig || savingPublishConfig}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        onProjectChange={handleProjectChange}
        onSave={() => void handleSave()}
        onExportZip={() => void handleExportZip()}
        onOpenPublish={() => void handleTopbarPublish()}
        onOpenCreateProject={() => setCreateOpen(true)}
        onOpenDuplicateProject={openDuplicateDialog}
      />

      <main className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 flex-col gap-2.5 overflow-hidden px-2.5 py-2.5 lg:flex-row">
        <div className="shrink-0 lg:h-full">
          <BuilderSidebar
            sections={BUILDER_SECTIONS}
            activeSectionId={activeSectionId}
            activeModuleId={activeModuleId}
            content={content}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
            onSectionChange={handleSidebarSectionChange}
            onModuleChange={handleSidebarModuleChange}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 lg:flex-row">
          <div className="order-2 min-h-0 min-w-0 lg:order-1 lg:w-[390px] xl:w-[430px]">
            {activeModuleId === 'history' ? (
              <BuilderHistoryPanel
                loading={loadingVersions}
                items={versions}
                restoringVersionId={restoringVersionId}
                onRefresh={() => void loadVersions()}
                onRestore={(versionId) => void handleRestoreVersion(versionId)}
              />
            ) : activeModuleId === 'clientSettings' ? (
              <section className="builder-surface flex h-full min-h-0 flex-col overflow-hidden">
                <header className="border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.96)] to-[rgba(9,18,37,0.92)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
                    Cliente
                  </p>
                  <h2 className="builder-heading mt-1.5 text-[22px] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
                    Configurações do Cliente
                  </h2>
                  <p className="mt-2 text-xs text-[var(--builder-text-secondary)]">
                    Dados centrais da marca e integrações do cliente atual.
                  </p>
                  <p className="mt-1 text-xs text-[var(--builder-text-muted)]">
                    As alterações são salvas pelo botão "Salvar" do topo.
                  </p>
                </header>

                <div className="builder-scroll flex-1 overflow-y-auto p-3">
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Nome da marca</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.brand}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              brand: event.target.value,
                            },
                          }))
                        }
                        placeholder="Ex.: EFITEC SOLAR"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Cidade</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.city}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              city: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>WhatsApp (E.164)</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.whatsappE164}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              whatsappE164: event.target.value,
                            },
                          }))
                        }
                        placeholder="5521999999999"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>URL do site</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.siteUrl}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              siteUrl: event.target.value,
                            },
                          }))
                        }
                        placeholder="https://www.exemplo.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Caminho de publicação (base path)</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.buildBasePath ?? ''}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              ...(event.target.value.trim()
                                ? { buildBasePath: event.target.value }
                                : (() => {
                                    const nextGlobal = { ...current.global };
                                    delete nextGlobal.buildBasePath;
                                    return nextGlobal;
                                  })()),
                            },
                          }))
                        }
                        placeholder="/pagina/"
                      />
                      <p className="text-[11px] text-[var(--builder-text-muted)]">
                        Ex.: <span className="font-mono">/pagina/</span> (padrão),{' '}
                        <span className="font-mono">/ecobox/</span> ou{' '}
                        <span className="font-mono">/</span> para raiz do domínio.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>CNPJ</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.cnpj}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              cnpj: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Endereço</p>
                      <textarea
                        className={builderTextAreaClassName}
                        rows={3}
                        value={content.global.address}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              address: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <BuilderImageField
                      label="Logo"
                      description="Logo exibida no cabeçalho do site."
                      value={content.global.logo ?? ''}
                      onChange={(nextValue) =>
                        handleContentChange((current) => ({
                          ...current,
                          global: {
                            ...current.global,
                            logo: nextValue,
                          },
                        }))
                      }
                      onUploadImage={handleUploadImage}
                    />
                    <BuilderImageLayoutControls
                      mode="logo"
                      value={logoLayoutControlValue}
                      onChange={(nextValue) =>
                        handleContentChange((current) => ({
                          ...current,
                          imageLayout: {
                            ...(current.imageLayout ?? {}),
                            logo: {
                              scale: nextValue.scale,
                              x: nextValue.x,
                              y: nextValue.y,
                            },
                          },
                        }))
                      }
                      onReset={() =>
                        handleContentChange((current) => {
                          const nextImageLayout = { ...(current.imageLayout ?? {}) };
                          delete nextImageLayout.logo;
                          return {
                            ...current,
                            imageLayout: Object.keys(nextImageLayout).length ? nextImageLayout : undefined,
                          };
                        })
                      }
                    />

                    <div className="my-1 border-t border-[var(--builder-border)]" />

                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Google Tag Manager ID</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.gtmId ?? ''}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              ...(event.target.value.trim()
                                ? { gtmId: event.target.value }
                                : (() => {
                                    const nextGlobal = { ...current.global };
                                    delete nextGlobal.gtmId;
                                    return nextGlobal;
                                  })()),
                            },
                          }))
                        }
                        placeholder="GTM-XXXXXXX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Webhook principal</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.webhookUrl ?? ''}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              ...(event.target.value.trim()
                                ? { webhookUrl: event.target.value }
                                : (() => {
                                    const nextGlobal = { ...current.global };
                                    delete nextGlobal.webhookUrl;
                                    return nextGlobal;
                                  })()),
                            },
                          }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Webhook secundário</p>
                      <input
                        className={builderInputClassName}
                        value={content.global.secondaryWebhookUrl ?? ''}
                        onChange={(event) =>
                          handleContentChange((current) => ({
                            ...current,
                            global: {
                              ...current.global,
                              ...(event.target.value.trim()
                                ? { secondaryWebhookUrl: event.target.value }
                                : (() => {
                                    const nextGlobal = { ...current.global };
                                    delete nextGlobal.secondaryWebhookUrl;
                                    return nextGlobal;
                                  })()),
                            },
                          }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <p className={builderLabelClassName}>Form ID</p>
                        <input
                          className={builderInputClassName}
                          value={content.global.formId ?? ''}
                          onChange={(event) =>
                            handleContentChange((current) => ({
                              ...current,
                              global: {
                                ...current.global,
                                ...(event.target.value.trim()
                                  ? { formId: event.target.value }
                                  : (() => {
                                      const nextGlobal = { ...current.global };
                                      delete nextGlobal.formId;
                                      return nextGlobal;
                                    })()),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className={builderLabelClassName}>Form Name</p>
                        <input
                          className={builderInputClassName}
                          value={content.global.formName ?? ''}
                          onChange={(event) =>
                            handleContentChange((current) => ({
                              ...current,
                              global: {
                                ...current.global,
                                ...(event.target.value.trim()
                                  ? { formName: event.target.value }
                                  : (() => {
                                      const nextGlobal = { ...current.global };
                                      delete nextGlobal.formName;
                                      return nextGlobal;
                                    })()),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className={builderLabelClassName}>Canal ID</p>
                        <input
                          className={builderInputClassName}
                          value={content.global.canalId ?? ''}
                          onChange={(event) =>
                            handleContentChange((current) => ({
                              ...current,
                              global: {
                                ...current.global,
                                ...(event.target.value.trim()
                                  ? { canalId: event.target.value }
                                  : (() => {
                                      const nextGlobal = { ...current.global };
                                      delete nextGlobal.canalId;
                                      return nextGlobal;
                                    })()),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : activeModuleId === 'publish' ? (
              <section className="builder-surface flex h-full min-h-0 flex-col overflow-hidden">
                <header className="border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.96)] to-[rgba(9,18,37,0.92)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
                    Publicação
                  </p>
                  <h2 className="builder-heading mt-1.5 text-[22px] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
                    Hospedagem do Cliente
                  </h2>
                  <p className="mt-2 text-xs text-[var(--builder-text-secondary)]">
                    {savedPublishConfig
                      ? 'Configuração salva. O botão "Publicar" no topo publica direto sem abrir modal.'
                      : 'Configure a conexão para habilitar publicação direta no botão "Publicar".'}
                  </p>
                  {publishConfigUpdatedAt ? (
                    <p className="mt-1 text-xs text-[var(--builder-text-muted)]">
                      Última atualização: {new Date(publishConfigUpdatedAt).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </header>

                <div className="builder-scroll flex-1 overflow-y-auto p-3">
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Provedor</p>
                      <select
                        className={builderInputClassName}
                        value={publishForm.provider}
                        onChange={(event) =>
                          setPublishForm((current) => ({
                            ...current,
                            provider: event.target.value as PublishProvider,
                          }))
                        }
                        disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
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
                          value={publishForm.host}
                          onChange={(event) =>
                            setPublishForm((current) => ({ ...current, host: event.target.value }))
                          }
                          placeholder="ftp.seu-dominio.com"
                          disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className={builderLabelClassName}>Porta</p>
                        <input
                          className={builderInputClassName}
                          value={publishForm.port}
                          onChange={(event) =>
                            setPublishForm((current) => ({ ...current, port: event.target.value }))
                          }
                          placeholder={publishForm.provider === 'ftp' ? '21' : '22'}
                          disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className={builderLabelClassName}>Caminho remoto</p>
                      <input
                        className={builderInputClassName}
                        value={publishForm.remotePath}
                        onChange={(event) =>
                          setPublishForm((current) => ({ ...current, remotePath: event.target.value }))
                        }
                        placeholder="public_html"
                        disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <p className={builderLabelClassName}>Usuário</p>
                        <input
                          className={builderInputClassName}
                          value={publishForm.username}
                          onChange={(event) =>
                            setPublishForm((current) => ({ ...current, username: event.target.value }))
                          }
                          placeholder="usuario_ftp"
                          disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className={builderLabelClassName}>Senha</p>
                        <input
                          type="password"
                          className={builderInputClassName}
                          value={publishForm.password}
                          onChange={(event) =>
                            setPublishForm((current) => ({ ...current, password: event.target.value }))
                          }
                          placeholder="••••••••"
                          disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                        />
                      </div>
                    </div>

                    {publishForm.provider === 'sftp' ? (
                      <>
                        <div className="space-y-1.5">
                          <p className={builderLabelClassName}>Chave privada (opcional)</p>
                          <textarea
                            className={builderTextAreaClassName}
                            rows={4}
                            value={publishForm.privateKey}
                            onChange={(event) =>
                              setPublishForm((current) => ({ ...current, privateKey: event.target.value }))
                            }
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                            disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className={builderLabelClassName}>Passphrase da chave (opcional)</p>
                          <input
                            type="password"
                            className={builderInputClassName}
                            value={publishForm.passphrase}
                            onChange={(event) =>
                              setPublishForm((current) => ({ ...current, passphrase: event.target.value }))
                            }
                            placeholder="Se a chave exigir"
                            disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                          />
                        </div>
                      </>
                    ) : (
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--builder-text-secondary)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-[var(--builder-border)] bg-[rgba(2,6,23,0.65)]"
                          checked={publishForm.secure}
                          onChange={(event) =>
                            setPublishForm((current) => ({ ...current, secure: event.target.checked }))
                          }
                          disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                        />
                        Usar FTPS (FTP seguro)
                      </label>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        className={builderSecondaryButtonClassName}
                        onClick={() => void handleSavePublishConfig()}
                        disabled={loadingPublishConfig || savingPublishConfig || testingPublishConnection || publishing}
                      >
                        {savingPublishConfig ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Salvando
                          </>
                        ) : (
                          'Salvar configuração'
                        )}
                      </button>
                      <button
                        type="button"
                        className={builderSecondaryButtonClassName}
                        onClick={() => void handleTestPublishConnection()}
                        disabled={loadingPublishConfig || testingPublishConnection || publishing || savingPublishConfig}
                      >
                        {testingPublishConnection ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testando conexão
                          </>
                        ) : (
                          'Testar conexão'
                        )}
                      </button>
                      <button
                        type="button"
                        className={builderPrimaryButtonClassName}
                        onClick={() => void handlePublishFromForm()}
                        disabled={loadingPublishConfig || publishing || testingPublishConnection || savingPublishConfig}
                      >
                        {publishing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Publicando
                          </>
                        ) : (
                          'Publicar agora'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <BuilderEditorPanel
                content={content}
                activeSectionId={activeSectionId}
                scrollToTopSignal={editorScrollToTopSignal}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSectionChange={(sectionId) => {
                  setActiveSectionId(sectionId);
                  setActiveModuleId('builder');
                }}
                onContentChange={handleContentChange}
                onUploadImage={handleUploadImage}
              />
            )}
          </div>

          <div className="order-1 min-h-0 min-w-0 flex-1 lg:order-2">
            <BuilderPreviewPane
              projectId={project.projectId}
              content={content}
              activeSectionId={activeSectionId}
              refreshSignal={previewRefreshSignal}
              onSectionChange={handlePreviewSectionChange}
            />
          </div>
        </div>
      </main>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="builder-heading text-xl">Configure a publicação primeiro</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2 text-sm text-[var(--builder-text-secondary)]">
            <p>
              Este cliente ainda não tem hospedagem configurada para publicação direta.
            </p>
            <p>
              Vá para o módulo <span className="font-semibold text-[var(--builder-text-primary)]">Publicação</span>,
              salve as credenciais e depois o botão <span className="font-semibold text-[var(--builder-text-primary)]">Publicar</span> no topo
              enviará direto sem abrir este modal.
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => setPublishOpen(false)}
            >
              Fechar
            </button>
            <button
              type="button"
              className={builderPrimaryButtonClassName}
              onClick={() => {
                setPublishOpen(false);
                setActiveModuleId('publish');
              }}
            >
              Abrir Publicação
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="builder-heading text-xl">Novo cliente</DialogTitle>
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
                placeholder="Nome exibido no topo"
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
              description: '',
            });
          }
        }}
      >
        <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="builder-heading text-xl">Duplicar cliente</DialogTitle>
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
                'Duplicar cliente'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
