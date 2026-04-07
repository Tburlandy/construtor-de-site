import { History, Loader2, RefreshCcw, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
} from './editors/BuilderEditorFields';

export interface BuilderContentVersionSummary {
  versionId: string;
  createdAt: string;
}

interface BuilderHistoryPanelProps {
  loading: boolean;
  items: BuilderContentVersionSummary[];
  restoringVersionId: string | null;
  onRefresh: () => void;
  onRestore: (versionId: string) => void;
}

function formatVersionDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BuilderHistoryPanel({
  loading,
  items,
  restoringVersionId,
  onRefresh,
  onRestore,
}: BuilderHistoryPanelProps) {
  return (
    <section className="builder-surface flex h-full min-h-0 flex-col overflow-hidden">
      <header className="border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.96)] to-[rgba(9,18,37,0.92)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
          Histórico
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <h2 className="builder-heading text-[22px] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
            Versões do Cliente
          </h2>
          <button type="button" className={builderSecondaryButtonClassName} onClick={onRefresh} disabled={loading}>
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      </header>

      <div className="builder-scroll flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] px-4 py-2 text-sm text-[var(--builder-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando versões...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.55)] p-4">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(14,165,233,0.14)]">
              <History className="h-4 w-4 text-[var(--builder-brand-primary)]" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--builder-text-primary)]">Sem versões registradas</p>
            <p className="mt-1 text-sm text-[var(--builder-text-secondary)]">
              As versões aparecem automaticamente após salvar alterações.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const restoring = restoringVersionId === item.versionId;
              return (
                <div
                  key={item.versionId}
                  className="rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.55)] p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--builder-text-muted)]">
                    {item.versionId}
                  </p>
                  <p className="mt-1 text-sm text-[var(--builder-text-secondary)]">
                    Criada em {formatVersionDate(item.createdAt)}
                  </p>
                  <button
                    type="button"
                    className={cn(builderPrimaryButtonClassName, 'mt-3')}
                    disabled={restoring}
                    onClick={() => onRestore(item.versionId)}
                  >
                    {restoring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Recuperando
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Recuperar versão
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
