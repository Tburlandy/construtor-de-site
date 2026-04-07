import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  fetchStudioBaseTemplateDivergence,
  studioBaseTemplateQueryKeys,
} from '@/hooks/useStudioBaseTemplate';
import type { StudioFieldDivergenceSummary } from '@/platform/contracts/studioTemplateInheritance';
import { cn } from '@/lib/utils';
import { builderSecondaryButtonClassName } from '@/components/studio-builder/editors/BuilderEditorFields';

const DEFAULT_TEMPLATE_KEY = 'style-1';

function uniqueDivergentClientCount(fieldSummaries: StudioFieldDivergenceSummary[]): number {
  const ids = new Set<string>();
  for (const f of fieldSummaries) {
    for (const id of f.divergentProjectIds ?? []) {
      ids.add(id);
    }
  }
  return ids.size;
}

export type TemplateDivergenceBadgeProps = {
  /** Chave do template na API (ex.: `style-1`). */
  templateKey?: string;
  /** Abre o diálogo de detalhe (lista por seção/path). */
  onOpenDialog: () => void;
  className?: string;
};

/**
 * Indicador na central do template: ponto vermelho quando há clientes divergentes
 * do baseline + atalho para o diálogo de detalhes.
 */
export function TemplateDivergenceBadge({
  templateKey = DEFAULT_TEMPLATE_KEY,
  onOpenDialog,
  className,
}: TemplateDivergenceBadgeProps) {
  const key = templateKey.trim() || DEFAULT_TEMPLATE_KEY;

  const { data, isPending, isError, error } = useQuery({
    queryKey: studioBaseTemplateQueryKeys.divergence(key),
    queryFn: () => fetchStudioBaseTemplateDivergence(key),
    staleTime: 30_000,
  });

  const divergentClients = data ? uniqueDivergentClientCount(data.fieldSummaries) : 0;
  const hasDivergence = divergentClients > 0;

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        type="button"
        className={cn(
          builderSecondaryButtonClassName,
          'relative gap-2 pr-3 text-xs font-semibold uppercase tracking-wide',
        )}
        onClick={() => onOpenDialog()}
        title={
          isError
            ? error instanceof Error
              ? error.message
              : 'Erro ao carregar divergência'
            : hasDivergence
              ? `${divergentClients} cliente(s) com conteúdo fora do padrão do template`
              : 'Nenhum cliente divergente detectado'
        }
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-80" aria-hidden />
        ) : isError ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
        ) : null}
        Divergência
        {!isPending && !isError && hasDivergence ? (
          <span className="rounded-full bg-[rgba(248,113,113,0.2)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-red-200">
            {divergentClients}
          </span>
        ) : null}
      </button>
      {!isPending && !isError && hasDivergence ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f172a] bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
