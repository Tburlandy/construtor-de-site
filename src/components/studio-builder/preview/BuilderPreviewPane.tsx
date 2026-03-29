import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuilderSectionId } from '../builderSections';
import { builderSecondaryButtonClassName } from '../editors/BuilderEditorFields';

interface BuilderPreviewPaneProps {
  projectId: string;
  activeSectionId: BuilderSectionId;
  refreshSignal: number;
}

interface PreviewMessagePayload {
  type: 'studio-builder:focus-section' | 'studio-builder:refresh-content';
  sectionId?: BuilderSectionId;
}

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
  activeSectionId,
  refreshSignal,
}: BuilderPreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const previewPath = useMemo(() => {
    return withBasePath(`/dev/studio/preview/${encodeURIComponent(projectId)}`);
  }, [projectId]);

  useEffect(() => {
    setIframeReady(false);
  }, [previewPath]);

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

  return (
    <section className="builder-surface flex min-h-[420px] flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.95)] to-[rgba(15,23,42,0.92)] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Preview
          </p>
          <h2 className="text-xl font-semibold text-[#e2e8f0]">Preview da página</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="relative flex-1 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),rgba(2,6,23,0.2)_35%,rgba(2,6,23,0.96))] p-4 md:p-5">
        <div className="relative h-full min-h-[340px] overflow-hidden rounded-[20px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.9)] shadow-[0_0_0_1px_rgba(148,163,184,0.08)]">
          {!iframeReady ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(2,6,23,0.7)] text-sm text-[var(--builder-text-secondary)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando preview em tempo real...
            </div>
          ) : null}
          <iframe
            ref={iframeRef}
            src={previewPath}
            title={`Preview do projeto ${projectId}`}
            onLoad={() => {
              setIframeReady(true);
              postMessageToPreview(iframeRef.current, {
                type: 'studio-builder:focus-section',
                sectionId: activeSectionId,
              });
            }}
            className={cn('h-full w-full border-0', !iframeReady && 'opacity-80')}
          />
        </div>
      </div>
    </section>
  );
}
