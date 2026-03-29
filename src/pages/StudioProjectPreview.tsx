import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ContentSchema, type Content } from '@/content/schema';
import Index from './Index';
import { clearContentCache, setContentRuntimeOverride } from '@/lib/content';
import type { BuilderSectionId } from '@/components/studio-builder/builderSections';

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

type BuilderPreviewMessage =
  | { type: 'studio-builder:focus-section'; sectionId?: string }
  | { type: 'studio-builder:refresh-content' }
  | { type: 'studio-builder:set-content'; content?: unknown };

const FOCUS_CLASS_NAME = 'studio-builder-preview-focus';

const IS_EMBEDDED = window !== window.top;

// Ordered from most specific to least — first match wins on click
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

export default function StudioProjectPreview() {
  const { projectId: projectIdParam, clientId: clientIdParam } = useParams<{
    projectId?: string;
    clientId?: string;
  }>();
  const projectId = useMemo(
    () => decodeProjectId(clientIdParam ?? projectIdParam),
    [clientIdParam, projectIdParam],
  );
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const [renderKey, setRenderKey] = useState(0);
  const [focusedSectionId, setFocusedSectionId] = useState<BuilderSectionId>('hero');

  const loadPreview = useCallback(
    async (options?: { preserveReadyState?: boolean }) => {
      const preserveReadyState = options?.preserveReadyState ?? false;
      if (!preserveReadyState) {
        setState({ status: 'loading' });
      }

      if (!projectId) {
        setState({ status: 'error', message: 'Cliente inválido para preview.' });
        return;
      }

      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/content`);

        if (response.status === 404) {
          setState({
            status: 'error',
            message: `Cliente ${projectId} não encontrado para preview.`,
          });
          return;
        }

        if (!response.ok) {
          throw new Error('fetch failed');
        }

        const projectContent = (await response.json()) as Content;
        clearContentCache();
        setContentRuntimeOverride(projectContent);
        setRenderKey((current) => current + 1);
        setState({ status: 'ready' });
      } catch {
        setState({
          status: 'error',
          message: 'Não foi possível carregar o conteúdo do cliente para preview.',
        });
      }
    },
    [projectId],
  );

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
          // Ignora payload inválido para não interromper o preview.
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

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
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
          Carregando preview do cliente...
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
          <p className="text-sm font-medium text-[#F8FAFC]">Preview indisponível</p>
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
