import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Content } from '@/content/schema';
import { ContentSchema } from '@/content/schema';
import { useToast } from '@/hooks/use-toast';
import { BuilderEditorPanel } from '@/components/studio-builder/BuilderEditorPanel';
import { builderPrimaryButtonClassName, builderSecondaryButtonClassName } from '@/components/studio-builder/editors/BuilderEditorFields';
import { BuilderSidebar, type BuilderSidebarModuleId } from '@/components/studio-builder/BuilderSidebar';
import { BUILDER_SECTIONS, type BuilderSectionId, type BuilderTabId } from '@/components/studio-builder/builderSections';
import { TemplateDivergenceBadge } from '@/components/studio-builder/TemplateDivergenceBadge';
import { TemplateDivergenceDialog } from '@/components/studio-builder/TemplateDivergenceDialog';
import { BuilderPreviewPane } from '@/components/studio-builder/preview/BuilderPreviewPane';
import { studioBaseTemplateQueryKeys } from '@/hooks/useStudioBaseTemplate';
import { clearContentCache, setContentRuntimeOverride } from '@/lib/content';
import Index from '@/pages/Index';
import '@/components/studio-builder/builderTheme.css';

const BASE_TEMPLATE_API = '/api/studio/base-templates/style-1';
const BASE_TEMPLATE_PREVIEW_PATH = '/preview/studio-base-template';
/** Placeholder para `BuilderPreviewPane` quando o iframe usa `previewPathOverride`. */
const BASE_TEMPLATE_PREVIEW_PROJECT_ID = 'style-1';

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

type BaseTemplateApiRecord = {
  templateKey?: string;
  styleId?: string;
  schemaVersion?: string | null;
  content: Content;
  updatedAt?: string;
  createdAt?: string | null;
};

export default function StudioBaseTemplatePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<Content | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<BuilderSectionId>('global');
  const [activeTab, setActiveTab] = useState<BuilderTabId>('data');
  const [activeModuleId, setActiveModuleId] = useState<BuilderSidebarModuleId>('builder');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);
  const [editorScrollToTopSignal, setEditorScrollToTopSignal] = useState(0);
  const [divergenceDialogOpen, setDivergenceDialogOpen] = useState(false);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(BASE_TEMPLATE_API);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível carregar o template base.'));
      }
      const record = payload as BaseTemplateApiRecord;
      const parsedContent = ContentSchema.parse(record.content);
      setContent(parsedContent);
      setSchemaVersion(
        typeof record.schemaVersion === 'string' && record.schemaVersion.trim()
          ? record.schemaVersion.trim()
          : null,
      );
      setHasUnsavedChanges(false);
      setLastSavedAt(typeof record.updatedAt === 'string' ? record.updatedAt : null);
      setPreviewRefreshSignal((n) => n + 1);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível carregar o template base.';
      setLoadError(message);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const handleContentChange = (updater: (current: Content) => Content) => {
    setContent((current) => {
      if (!current) return current;
      const next = updater(current);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    if (!content) return;

    setSaving(true);
    try {
      const body: { content: Content; schemaVersion?: string } = { content };
      if (schemaVersion?.trim()) {
        body.schemaVersion = schemaVersion.trim();
      }

      const response = await fetch(BASE_TEMPLATE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Falha ao salvar o template base.'));
      }
      const record = payload as BaseTemplateApiRecord;
      const parsedContent = ContentSchema.parse(record.content);
      setContent(parsedContent);
      setSchemaVersion(
        typeof record.schemaVersion === 'string' && record.schemaVersion.trim()
          ? record.schemaVersion.trim()
          : null,
      );
      setHasUnsavedChanges(false);
      setLastSavedAt(typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString());
      setPreviewRefreshSignal((n) => n + 1);
      void queryClient.invalidateQueries({
        queryKey: studioBaseTemplateQueryKeys.divergence('style-1'),
      });
      toast({
        title: 'Template base salvo',
        description: 'O conteúdo do Estilo 1 foi persistido no template central.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o template base.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [content, queryClient, schemaVersion, toast]);

  const handleUploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload-image', {
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

  const bumpEditorScrollToTop = useCallback(() => {
    setEditorScrollToTopSignal((n) => n + 1);
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
      if (moduleId !== 'builder') {
        return;
      }
      setActiveModuleId('builder');
      setActiveTab('data');
      bumpEditorScrollToTop();
    },
    [bumpEditorScrollToTop],
  );

  if (loading) {
    return (
      <div className="studio-builder min-h-screen bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)]">
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--builder-text-secondary)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando template base…
        </div>
      </div>
    );
  }

  if (loadError || !content) {
    return (
      <div className="studio-builder min-h-screen bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)] p-6">
        <div className="mx-auto mt-16 max-w-xl rounded-[var(--builder-radius-card)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.85)] p-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(127,29,29,0.35)]">
            <AlertTriangle className="h-5 w-5 text-[var(--builder-danger)]" />
          </div>
          <h2 className="builder-heading text-2xl font-bold">Template base indisponível</h2>
          <p className="mt-2 text-sm text-[var(--builder-text-secondary)]">{loadError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => void loadTemplate()}
            >
              Tentar novamente
            </button>
            <Link
              to="/construtor"
              className={`${builderPrimaryButtonClassName} inline-flex items-center justify-center no-underline`}
            >
              Voltar aos clientes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-builder flex h-screen flex-col overflow-hidden bg-[var(--builder-bg-page)] text-[var(--builder-text-primary)]">
      <header className="shrink-0 border-b border-[var(--builder-border)] bg-gradient-to-r from-[#0c1a2e] via-[#0f172a] to-[#1a1030] px-3 py-2.5 sm:px-4">
        <div className="mx-auto flex max-w-[1760px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link
              to="/construtor"
              className={`${builderSecondaryButtonClassName} shrink-0 self-start sm:self-auto`}
            >
              ← Clientes
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100">
                Template base
              </span>
              <span className="text-sm font-semibold text-[var(--builder-text-primary)]">Estilo 1 · style-1</span>
            </div>
            <p className="text-xs text-[var(--builder-text-muted)] sm:max-w-md">
              Padrão central com placeholders {'{{brand}}'}, {'{{city}}'}, etc. Não é um cliente: alterações aqui definem o que os projetos podem herdar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <TemplateDivergenceBadge onOpenDialog={() => setDivergenceDialogOpen(true)} />
            {hasUnsavedChanges ? (
              <span className="text-xs font-medium text-amber-200/90">Alterações não salvas</span>
            ) : null}
            {lastSavedAt ? (
              <span className="text-[11px] text-[var(--builder-text-muted)]">
                Salvo: {new Date(lastSavedAt).toLocaleString('pt-BR')}
              </span>
            ) : null}
            <button
              type="button"
              className={builderPrimaryButtonClassName}
              disabled={saving || !hasUnsavedChanges}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar template base'
              )}
            </button>
          </div>
        </div>
      </header>

      <TemplateDivergenceDialog open={divergenceDialogOpen} onOpenChange={setDivergenceDialogOpen} />

      <main className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 flex-col gap-2.5 overflow-hidden px-2.5 py-2.5 lg:flex-row">
        <div className="shrink-0 lg:h-full">
          <BuilderSidebar
            variant="baseTemplate"
            sections={BUILDER_SECTIONS}
            activeSectionId={activeSectionId}
            activeModuleId={activeModuleId}
            content={content}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
            onSectionChange={handleSidebarSectionChange}
            onModuleChange={handleSidebarModuleChange}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 lg:flex-row">
          <div className="order-2 min-h-0 min-w-0 lg:order-1 lg:w-[390px] xl:w-[430px]">
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
          </div>

          <div className="order-1 min-h-0 min-w-0 flex-1 lg:order-2">
            <BuilderPreviewPane
              projectId={BASE_TEMPLATE_PREVIEW_PROJECT_ID}
              previewPathOverride={BASE_TEMPLATE_PREVIEW_PATH}
              previewIframeTitle="Preview do template base Estilo 1"
              previewHeading="Preview do template base"
              content={content}
              activeSectionId={activeSectionId}
              refreshSignal={previewRefreshSignal}
              onSectionChange={handlePreviewSectionChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Preview em iframe (rota dedicada), espelhando `StudioProjectPreview` com fonte no template central ---

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

type BuilderPreviewMessage =
  | { type: 'studio-builder:focus-section'; sectionId?: string }
  | { type: 'studio-builder:refresh-content' }
  | { type: 'studio-builder:set-content'; content?: unknown };

const FOCUS_CLASS_NAME = 'studio-builder-preview-focus';
const IS_EMBEDDED = typeof window !== 'undefined' && window !== window.top;

const CLICK_SECTION_MAP: Array<{ selector: string; sectionId: BuilderSectionId }> = [
  { selector: '#forma-pagamento', sectionId: 'financing' },
  { selector: '#sobre-nos', sectionId: 'proofBar' },
  { selector: '#casos', sectionId: 'showcase' },
  { selector: '#cuidamos-tudo', sectionId: 'fullService' },
  { selector: '#como-funciona', sectionId: 'howItWorks' },
  { selector: '#contato', sectionId: 'cta' },
  { selector: 'footer', sectionId: 'footer' },
  { selector: 'header', sectionId: 'global' },
  { selector: 'section', sectionId: 'hero' },
];

const SECTION_SELECTORS: Record<BuilderSectionId, string[]> = {
  global: ['header', 'section'],
  seo: ['header', 'section'],
  hero: ['section'],
  financing: ['#forma-pagamento'],
  benefits: ['#cuidamos-tudo'],
  proofBar: ['#sobre-nos'],
  fullService: ['#cuidamos-tudo'],
  showcase: ['#casos'],
  howItWorks: ['#como-funciona'],
  media: ['#cuidamos-tudo', '#sobre-nos', '#como-funciona'],
  cta: ['#contato'],
  footer: ['footer'],
};

function isBuilderSectionId(value: string): value is BuilderSectionId {
  return value in SECTION_SELECTORS;
}

function resolveSectionElement(sectionId: BuilderSectionId): HTMLElement | null {
  const selectors = SECTION_SELECTORS[sectionId] ?? [];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      return element;
    }
  }
  return null;
}

export function StudioBaseTemplatePreview() {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const [renderKey, setRenderKey] = useState(0);
  const [focusedSectionId, setFocusedSectionId] = useState<BuilderSectionId>('hero');

  const loadPreview = useCallback(async (options?: { preserveReadyState?: boolean }) => {
    const preserveReadyState = options?.preserveReadyState ?? false;
    if (!preserveReadyState) {
      setState({ status: 'loading' });
    }

    try {
      const response = await fetch(BASE_TEMPLATE_API);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível carregar o template base para preview.'));
      }
      const record = payload as BaseTemplateApiRecord;
      const projectContent = ContentSchema.parse(record.content);
      clearContentCache();
      setContentRuntimeOverride(projectContent);
      setRenderKey((current) => current + 1);
      setState({ status: 'ready' });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error && error.message
            ? error.message
            : 'Não foi possível carregar o template base para preview.',
      });
    }
  }, []);

  useEffect(() => {
    void loadPreview();
    return () => {
      setContentRuntimeOverride(null);
      clearContentCache();
    };
  }, [loadPreview]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<BuilderPreviewMessage>) => {
      if (event.origin !== window.location.origin || !event.data) {
        return;
      }

      if (event.data.type === 'studio-builder:refresh-content') {
        void loadPreview({ preserveReadyState: true });
        return;
      }

      if (event.data.type === 'studio-builder:set-content' && event.data.content) {
        try {
          const nextContent = ContentSchema.parse(event.data.content);
          clearContentCache();
          setContentRuntimeOverride(nextContent);
          setRenderKey((current) => current + 1);
          setState((current) => (current.status === 'ready' ? current : { status: 'ready' }));
        } catch {
          // Ignora payload inválido
        }
        return;
      }

      if (event.data.type === 'studio-builder:focus-section' && event.data.sectionId) {
        if (isBuilderSectionId(event.data.sectionId)) {
          setFocusedSectionId(event.data.sectionId);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [loadPreview]);

  useEffect(() => {
    if (!IS_EMBEDDED || state.status !== 'ready') {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const clickedLink = target.closest('a[href]');
      if (clickedLink instanceof HTMLAnchorElement) {
        const href = clickedLink.getAttribute('href')?.trim() ?? '';
        if (!href.startsWith('#')) {
          event.preventDefault();
        }
      }

      for (const { selector, sectionId } of CLICK_SECTION_MAP) {
        if (target.closest(selector)) {
          window.parent.postMessage(
            { type: 'studio-builder:select-section', sectionId },
            window.location.origin,
          );
          break;
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [state.status, renderKey]);

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll(`.${FOCUS_CLASS_NAME}`).forEach((node) => {
        node.classList.remove(FOCUS_CLASS_NAME);
      });

      const target = resolveSectionElement(focusedSectionId);
      if (!target) {
        return;
      }

      target.classList.add(FOCUS_CLASS_NAME);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [focusedSectionId, renderKey, state.status]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#020617] text-[#F8FAFC] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-[#94A3B8]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando preview do template base…
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-[#020617] text-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-[#7F1D1D]/60 bg-[#1F2937]/60 p-6 text-center space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#7F1D1D]/60 mx-auto">
            <AlertTriangle className="h-5 w-5 text-[#F87171]" />
          </div>
          <p className="text-sm font-medium text-[#F8FAFC]">Preview do template base indisponível</p>
          <p className="text-xs text-[#CBD5E1]">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .${FOCUS_CLASS_NAME} {
          outline: 2px solid rgba(14, 165, 233, 0.92);
          outline-offset: 4px;
          box-shadow: 0 0 0 8px rgba(14, 165, 233, 0.14);
          border-radius: 16px;
          transition: box-shadow 180ms ease, outline-color 180ms ease;
        }
        ${IS_EMBEDDED ? `
        header:hover, footer:hover, section:hover,
        #sobre-nos:hover, #forma-pagamento:hover, #casos:hover,
        #como-funciona:hover, #cuidamos-tudo:hover, #contato:hover {
          cursor: pointer;
          outline: 2px dashed rgba(14, 165, 233, 0.45);
          outline-offset: 4px;
          border-radius: 12px;
        }
        ` : ''}
      `}</style>
      <Index key={renderKey} />
    </>
  );
}
