import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Content } from '@/content/schema';
import type { BuilderSectionId } from '../builderSections';
import { builderSecondaryButtonClassName } from '../editors/BuilderEditorFields';

interface BuilderPreviewPaneProps {
  projectId: string;
  content: Content;
  activeSectionId: BuilderSectionId;
  refreshSignal: number;
  onSectionChange?: (sectionId: BuilderSectionId) => void;
}

interface PreviewMessagePayload {
  type: 'studio-builder:focus-section' | 'studio-builder:refresh-content' | 'studio-builder:set-content';
  sectionId?: BuilderSectionId;
  content?: Content;
}

interface PreviewInboundMessage {
  type: 'studio-builder:select-section';
  sectionId?: string;
}

const PREVIEW_FRAME_WIDTH = 1366;
const PREVIEW_FRAME_HEIGHT = 860;
const MIN_PREVIEW_SCALE = 0.42;

function withBasePath(pathname: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}${pathname}`;
}

function postMessageToPreview(iframe: HTMLIFrameElement | null, payload: PreviewMessagePayload) {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(payload, window.location.origin);
}

export function BuilderPreviewPane({
  projectId,
  content,
  activeSectionId,
  refreshSignal,
  onSectionChange,
}: BuilderPreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const previewPath = useMemo(() => {
    return withBasePath(`/preview/${encodeURIComponent(projectId)}`);
  }, [projectId]);

  const scaledFrameWidth = PREVIEW_FRAME_WIDTH * previewScale;
  const scaledFrameHeight = PREVIEW_FRAME_HEIGHT * previewScale;

  useEffect(() => {
    setIframeReady(false);
  }, [previewPath]);

  useEffect(() => {
    if (!onSectionChange) return;

    const handleMessage = (event: MessageEvent<PreviewInboundMessage>) => {
      if (event.origin !== window.location.origin || !event.data) return;
      if (event.data.type === 'studio-builder:select-section' && event.data.sectionId) {
        onSectionChange(event.data.sectionId as BuilderSectionId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSectionChange]);

  useEffect(() => {
    const element = previewViewportRef.current;
    if (!element) {
      return;
    }

    const recalculateScale = () => {
      const nextWidth = Math.max(1, element.clientWidth - 8);
      const nextHeight = Math.max(1, element.clientHeight - 8);
      const widthScale = nextWidth / PREVIEW_FRAME_WIDTH;
      const heightScale = nextHeight / PREVIEW_FRAME_HEIGHT;
      const nextScale = Math.max(MIN_PREVIEW_SCALE, Math.min(1, Math.min(widthScale, heightScale)));
      setPreviewScale(nextScale);
    };

    recalculateScale();
    const observer = new ResizeObserver(recalculateScale);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!iframeReady) {
      return;
    }

    postMessageToPreview(iframeRef.current, {
      type: 'studio-builder:focus-section',
      sectionId: activeSectionId,
    });
  }, [activeSectionId, iframeReady]);

  useEffect(() => {
    if (!iframeReady) {
      return;
    }

    postMessageToPreview(iframeRef.current, {
      type: 'studio-builder:refresh-content',
    });
  }, [iframeReady, refreshSignal]);

  useEffect(() => {
    if (!iframeReady) {
      return;
    }

    postMessageToPreview(iframeRef.current, {
      type: 'studio-builder:set-content',
      content,
    });
  }, [content, iframeReady]);

  return (
    <section className="builder-surface flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.96)] to-[rgba(9,18,37,0.92)] px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Preview
          </p>
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Preview do site</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={builderSecondaryButtonClassName}
            onClick={() =>
              postMessageToPreview(iframeRef.current, {
                type: 'studio-builder:refresh-content',
              })
            }
          >
            <RotateCw className="h-4 w-4" />
            Atualizar
          </button>
          <a
            href={previewPath}
            target="_blank"
            rel="noreferrer"
            className={builderSecondaryButtonClassName}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </a>
        </div>
      </header>

      <div
        ref={previewViewportRef}
        className="builder-scroll relative flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),rgba(2,6,23,0.2)_35%,rgba(2,6,23,0.97))] p-2"
      >
        <div className="mx-auto flex min-h-full items-start justify-center">
          <div
            className="relative shrink-0 overflow-hidden rounded-[14px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.9)] shadow-[0_0_0_1px_rgba(148,163,184,0.08)]"
            style={{
              width: `${scaledFrameWidth}px`,
              height: `${scaledFrameHeight}px`,
            }}
          >
          {!iframeReady ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(2,6,23,0.7)] text-sm text-[var(--builder-text-secondary)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando preview em tempo real...
            </div>
          ) : null}
          <iframe
            ref={iframeRef}
            src={previewPath}
            title={`Preview do cliente ${projectId}`}
            onLoad={() => {
              setIframeReady(true);
              postMessageToPreview(iframeRef.current, {
                type: 'studio-builder:set-content',
                content,
              });
              postMessageToPreview(iframeRef.current, {
                type: 'studio-builder:focus-section',
                sectionId: activeSectionId,
              });
            }}
            style={{
              width: `${PREVIEW_FRAME_WIDTH}px`,
              height: `${PREVIEW_FRAME_HEIGHT}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
            className={cn('border-0', !iframeReady && 'opacity-80')}
          />
          </div>
        </div>
      </div>
    </section>
  );
}
