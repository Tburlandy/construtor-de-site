import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import {
  fetchStudioBaseTemplateDivergence,
  fetchStudioBaseTemplateDivergenceClients,
  studioBaseTemplateQueryKeys,
} from '@/hooks/useStudioBaseTemplate';
import type {
  StudioFieldDivergenceSummary,
  StudioSectionDivergenceSummary,
} from '@/platform/contracts/studioTemplateInheritance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { builderSecondaryButtonClassName } from '@/components/studio-builder/editors/BuilderEditorFields';

const DEFAULT_TEMPLATE_KEY = 'style-1';

/** Ordem V1: blocos compostos + campos frequentes (expansível depois). */
const TEMPLATE_DIVERGENCE_V1_PRIORITY_PATHS: readonly string[] = [
  'global.brand',
  'global.city',
  'seo.title',
  'seo.description',
  'hero.headline',
  'hero.subheadline',
  'hero.stats',
  'hero.background',
  'hero.floatingCtaLabel',
  'header.menu',
  'proofBar.cards',
  'proofBar.image',
  'fullService.services',
  'howItWorks.steps',
  'howItWorks.image',
  'showcase.projects',
  'financing.items',
  'benefits',
  'hiddenPageSections',
  'imageLayout',
];

const PRIORITY_INDEX = new Map(TEMPLATE_DIVERGENCE_V1_PRIORITY_PATHS.map((p, i) => [p, i]));

const SECTION_LABELS: Record<string, string> = {
  header: 'Menu / cabeçalho',
  global: 'Dados globais',
  seo: 'SEO',
  hero: 'Hero',
  financing: 'Financiamento',
  proofBar: 'Prova social',
  fullService: 'Serviço completo',
  howItWorks: 'Como funciona',
  showcase: 'Projetos',
  benefits: 'Benefícios',
  cta: 'Contato',
  footer: 'Rodapé',
  imageLayout: 'Recortes de imagem',
  hiddenPageSections: 'Seções ocultas',
};

function sectionIdFromPath(path: string): string {
  const dot = path.indexOf('.');
  return dot === -1 ? path : path.slice(0, dot);
}

function labelForSection(sectionId: string): string {
  return SECTION_LABELS[sectionId] ?? sectionId;
}

function uniqueDivergentClientCount(fieldSummaries: StudioFieldDivergenceSummary[]): number {
  const ids = new Set<string>();
  for (const f of fieldSummaries) {
    for (const id of f.divergentProjectIds ?? []) {
      ids.add(id);
    }
  }
  return ids.size;
}

function splitFields(summaries: StudioFieldDivergenceSummary[]): {
  priority: StudioFieldDivergenceSummary[];
  other: StudioFieldDivergenceSummary[];
} {
  const priority = summaries.filter((f) => PRIORITY_INDEX.has(f.path));
  const other = summaries.filter((f) => !PRIORITY_INDEX.has(f.path));
  priority.sort((a, b) => (PRIORITY_INDEX.get(a.path) ?? 999) - (PRIORITY_INDEX.get(b.path) ?? 999));
  other.sort((a, b) => a.path.localeCompare(b.path));
  return { priority, other };
}

function clientIdsForSection(
  section: StudioSectionDivergenceSummary,
  allFields: StudioFieldDivergenceSummary[],
): string[] {
  const paths = new Set(section.divergentFieldPaths ?? []);
  const ids = new Set<string>();
  for (const f of allFields) {
    if (!paths.has(f.path)) continue;
    for (const id of f.divergentProjectIds ?? []) {
      ids.add(id);
    }
  }
  return [...ids].sort();
}

export type TemplateDivergenceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateKey?: string;
};

export function TemplateDivergenceDialog({
  open,
  onOpenChange,
  templateKey = DEFAULT_TEMPLATE_KEY,
}: TemplateDivergenceDialogProps) {
  const key = templateKey.trim() || DEFAULT_TEMPLATE_KEY;
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: studioBaseTemplateQueryKeys.divergence(key),
    queryFn: () => fetchStudioBaseTemplateDivergence(key),
    enabled: open,
    staleTime: 15_000,
  });

  const fieldSummaries = useMemo(
    () => summaryQuery.data?.fieldSummaries ?? [],
    [summaryQuery.data],
  );
  const expandedField = expandedPath ? fieldSummaries.find((f) => f.path === expandedPath) : undefined;
  const needsClientsFallback =
    open &&
    Boolean(expandedPath) &&
    !(expandedField?.divergentProjectIds && expandedField.divergentProjectIds.length > 0);

  /** Se o resumo não trouxer `divergentProjectIds`, busca o endpoint dedicado. */
  const clientsFallbackQuery = useQuery({
    queryKey: studioBaseTemplateQueryKeys.divergenceClients(key, expandedPath ?? ''),
    queryFn: () => fetchStudioBaseTemplateDivergenceClients(key, expandedPath!),
    enabled: needsClientsFallback,
    staleTime: 15_000,
  });

  const sectionSummaries = useMemo(
    () => summaryQuery.data?.sectionSummaries ?? [],
    [summaryQuery.data],
  );
  const sortedSections = useMemo(
    () => [...sectionSummaries].sort((a, b) => a.sectionId.localeCompare(b.sectionId)),
    [sectionSummaries],
  );
  const { priority: priorityFields, other: otherFields } = useMemo(
    () => splitFields(fieldSummaries),
    [fieldSummaries],
  );

  const totalDivergentClients = useMemo(() => uniqueDivergentClientCount(fieldSummaries), [fieldSummaries]);

  const resolveClientsForPath = (path: string): string[] => {
    const fromSummary = fieldSummaries.find((f) => f.path === path)?.divergentProjectIds;
    if (fromSummary?.length) {
      return [...fromSummary].sort();
    }
    if (expandedPath === path && clientsFallbackQuery.data?.divergentProjectIds.length) {
      return clientsFallbackQuery.data.divergentProjectIds;
    }
    return [];
  };

  const togglePath = (path: string) => {
    setExpandedPath((current) => (current === path ? null : path));
    setExpandedSectionId(null);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId((current) => (current === sectionId ? null : sectionId));
    setExpandedPath(null);
  };

  useEffect(() => {
    if (!open) {
      setExpandedPath(null);
      setExpandedSectionId(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(85vh,720px)] max-w-2xl overflow-hidden border-[var(--builder-border)] bg-[#0f172a] p-0 text-[var(--builder-text-primary)]',
        )}
      >
        <DialogHeader className="border-b border-[var(--builder-border)] px-5 py-4 text-left">
          <DialogTitle className="builder-heading text-lg text-[var(--builder-text-primary)]">
            Divergência vs template base
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--builder-text-secondary)]">
            Clientes cujo conteúdo resolvido difere do baseline do Estilo 1 (após variáveis). Por seção e por
            path; expanda para ver IDs e abrir no builder.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {summaryQuery.isPending ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[var(--builder-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando divergência…
            </div>
          ) : summaryQuery.isError ? (
            <p className="py-4 text-sm text-red-300">
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : 'Não foi possível carregar a divergência.'}
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-[var(--builder-text-secondary)]">
                <span className="font-semibold text-[var(--builder-text-primary)]">{totalDivergentClients}</span>{' '}
                cliente(s) com pelo menos um campo fora do padrão ·{' '}
                <span className="font-semibold text-[var(--builder-text-primary)]">
                  {fieldSummaries.length}
                </span>{' '}
                paths divergentes
              </p>

              <section className="mb-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--builder-accent-warm)]">
                  Por seção
                </h3>
                <ul className="space-y-1">
                  {sortedSections.map((section) => (
                    <li
                      key={section.sectionId}
                      className="rounded-lg border border-[var(--builder-border)] bg-[rgba(15,23,42,0.6)]"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-[rgba(14,165,233,0.08)]"
                        onClick={() => toggleSection(section.sectionId)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {expandedSectionId === section.sectionId ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--builder-text-muted)]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--builder-text-muted)]" />
                          )}
                          <span className="truncate font-medium text-[var(--builder-text-primary)]">
                            {labelForSection(section.sectionId)}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--builder-text-muted)]">
                            {section.sectionId}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-[var(--builder-text-secondary)]">
                          {section.divergentClientCount} cliente(s) · {section.divergentFieldCount ?? '—'} campo(s)
                        </span>
                      </button>
                      {expandedSectionId === section.sectionId ? (
                        <div className="border-t border-[var(--builder-border)] px-3 py-2 pb-3">
                          <p className="mb-2 text-[11px] text-[var(--builder-text-muted)]">
                            Clientes com divergência nesta seção:
                          </p>
                          <ClientIdList
                            ids={clientIdsForSection(section, fieldSummaries)}
                            loading={false}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {sortedSections.length === 0 ? (
                  <p className="text-sm text-[var(--builder-text-muted)]">Nenhuma divergência por seção.</p>
                ) : null}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--builder-accent-warm)]">
                  Campos principais (paths)
                </h3>
                <ul className="space-y-1">
                  {priorityFields.map((field) => (
                    <FieldRow
                      key={field.path}
                      field={field}
                      expanded={expandedPath === field.path}
                      onToggle={() => togglePath(field.path)}
                      clientIds={resolveClientsForPath(field.path)}
                      clientsLoading={
                        expandedPath === field.path &&
                        !(field.divergentProjectIds && field.divergentProjectIds.length > 0) &&
                        clientsFallbackQuery.isPending
                      }
                    />
                  ))}
                </ul>

                {otherFields.length > 0 ? (
                  <>
                    <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--builder-text-muted)]">
                      Outros paths ({otherFields.length})
                    </h4>
                    <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
                      {otherFields.map((field) => (
                        <FieldRow
                          key={field.path}
                          field={field}
                          expanded={expandedPath === field.path}
                          onToggle={() => togglePath(field.path)}
                          clientIds={resolveClientsForPath(field.path)}
                          clientsLoading={
                            expandedPath === field.path &&
                            !(field.divergentProjectIds && field.divergentProjectIds.length > 0) &&
                            clientsFallbackQuery.isPending
                          }
                        />
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            </>
          )}
        </div>

        <div className="border-t border-[var(--builder-border)] px-5 py-3">
          <button
            type="button"
            className={builderSecondaryButtonClassName}
            onClick={() => {
              setExpandedPath(null);
              setExpandedSectionId(null);
              onOpenChange(false);
            }}
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClientIdList({ ids, loading }: { ids: string[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-[var(--builder-text-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (ids.length === 0) {
    return <p className="text-xs text-[var(--builder-text-muted)]">Nenhum ID listado para este recorte.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {ids.map((id) => (
        <li key={id}>
          <Link
            to={`/cliente/${encodeURIComponent(id)}`}
            className="text-sm font-medium text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
          >
            {id}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FieldRow({
  field,
  expanded,
  onToggle,
  clientIds,
  clientsLoading,
}: {
  field: StudioFieldDivergenceSummary;
  expanded: boolean;
  onToggle: () => void;
  clientIds: string[];
  clientsLoading: boolean;
}) {
  return (
    <li className="rounded-lg border border-[var(--builder-border)] bg-[rgba(15,23,42,0.6)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-[rgba(14,165,233,0.08)]"
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--builder-text-muted)]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--builder-text-muted)]" />
          )}
          <span className="truncate font-mono text-[12px] text-sky-200/90">{field.path}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-[var(--builder-text-secondary)]">
          {field.divergentClientCount} cliente(s)
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-[var(--builder-border)] px-3 py-2 pb-3">
          <p className="mb-2 text-[11px] text-[var(--builder-text-muted)]">
            {labelForSection(sectionIdFromPath(field.path))} — abrir no builder:
          </p>
          <ClientIdList ids={clientIds} loading={clientsLoading} />
        </div>
      ) : null}
    </li>
  );
}
