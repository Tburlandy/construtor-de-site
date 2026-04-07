import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Content } from '@/content/schema';
import { ContentSchema } from '@/content/schema';
import {
  StudioFieldDivergenceSummarySchema,
  StudioSectionDivergenceSummarySchema,
} from '@/platform/contracts/studioTemplateInheritance';

const DEFAULT_TEMPLATE_KEY = 'style-1';

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

/** Resposta do GET `/api/studio/base-templates/:templateKey`. */
export const StudioBaseTemplateApiRecordSchema = z.object({
  templateKey: z.string(),
  styleId: z.string(),
  schemaVersion: z.string().nullable().optional(),
  content: ContentSchema,
  updatedAt: z.string(),
  createdAt: z.string().nullable().optional(),
});
export type StudioBaseTemplateApiRecord = z.infer<typeof StudioBaseTemplateApiRecordSchema>;

/** Resposta do GET `.../divergence`. */
export const StudioBaseTemplateDivergenceResponseSchema = z.object({
  templateKey: z.string(),
  fieldSummaries: z.array(StudioFieldDivergenceSummarySchema),
  sectionSummaries: z.array(StudioSectionDivergenceSummarySchema),
});
export type StudioBaseTemplateDivergenceResponse = z.infer<
  typeof StudioBaseTemplateDivergenceResponseSchema
>;

/** Resposta do GET `.../divergence/clients?path=`. */
export const StudioBaseTemplateDivergenceClientsResponseSchema = z.object({
  templateKey: z.string(),
  path: z.string(),
  divergentClientCount: z.number().int().nonnegative(),
  divergentProjectIds: z.array(z.string()),
});
export type StudioBaseTemplateDivergenceClientsResponse = z.infer<
  typeof StudioBaseTemplateDivergenceClientsResponseSchema
>;

export type SaveStudioBaseTemplateInput = {
  content: Content;
  schemaVersion?: string;
};

/** Chaves estáveis para React Query e invalidação manual. */
export const studioBaseTemplateQueryKeys = {
  all: ['studio', 'base-template'] as const,
  record: (templateKey: string) => [...studioBaseTemplateQueryKeys.all, templateKey] as const,
  divergence: (templateKey: string) => [...studioBaseTemplateQueryKeys.record(templateKey), 'divergence'] as const,
  divergenceClients: (templateKey: string, path: string) =>
    [...studioBaseTemplateQueryKeys.divergence(templateKey), 'clients', path] as const,
};

function baseTemplateUrl(templateKey: string): string {
  return `/api/studio/base-templates/${encodeURIComponent(templateKey)}`;
}

async function fetchStudioBaseTemplateRecord(templateKey: string): Promise<StudioBaseTemplateApiRecord> {
  const response = await fetch(baseTemplateUrl(templateKey));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao carregar o template base.'));
  }
  return StudioBaseTemplateApiRecordSchema.parse(payload);
}

async function putStudioBaseTemplateRecord(
  templateKey: string,
  input: SaveStudioBaseTemplateInput,
): Promise<StudioBaseTemplateApiRecord> {
  const body: { content: Content; schemaVersion?: string } = { content: input.content };
  if (input.schemaVersion?.trim()) {
    body.schemaVersion = input.schemaVersion.trim();
  }

  const response = await fetch(baseTemplateUrl(templateKey), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao salvar o template base.'));
  }
  return StudioBaseTemplateApiRecordSchema.parse(payload);
}

export async function fetchStudioBaseTemplateDivergence(
  templateKey: string,
): Promise<StudioBaseTemplateDivergenceResponse> {
  const response = await fetch(`${baseTemplateUrl(templateKey)}/divergence`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao carregar divergência do template base.'));
  }
  return StudioBaseTemplateDivergenceResponseSchema.parse(payload);
}

export async function fetchStudioBaseTemplateDivergenceClients(
  templateKey: string,
  path: string,
): Promise<StudioBaseTemplateDivergenceClientsResponse> {
  const params = new URLSearchParams({ path });
  const response = await fetch(`${baseTemplateUrl(templateKey)}/divergence/clients?${params}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao carregar clientes divergentes.'));
  }
  return StudioBaseTemplateDivergenceClientsResponseSchema.parse(payload);
}

export type UseStudioBaseTemplateOptions = {
  /** Chave do template na API (default `style-1`). */
  templateKey?: string;
  /** Quando true, dispara GET `.../divergence`. */
  fetchDivergenceSummary?: boolean;
  /**
   * Path lógico no `Content` (ex. `hero.headline`). Quando não vazio, dispara GET
   * `.../divergence/clients?path=`.
   */
  divergenceClientsForPath?: string | null;
};

/**
 * Acesso à API do template central: registro (GET/PUT), resumo de divergência e clientes por path.
 * Usa TanStack Query; invalida todas as queries do template após salvar.
 */
export function useStudioBaseTemplate(options?: UseStudioBaseTemplateOptions) {
  const queryClient = useQueryClient();
  const templateKey = options?.templateKey?.trim() || DEFAULT_TEMPLATE_KEY;
  const fetchDivergenceSummary = options?.fetchDivergenceSummary ?? false;
  const divergenceClientsPath = options?.divergenceClientsForPath?.trim() ?? '';

  const recordQuery = useQuery({
    queryKey: studioBaseTemplateQueryKeys.record(templateKey),
    queryFn: () => fetchStudioBaseTemplateRecord(templateKey),
  });

  const divergenceSummaryQuery = useQuery({
    queryKey: studioBaseTemplateQueryKeys.divergence(templateKey),
    queryFn: () => fetchStudioBaseTemplateDivergence(templateKey),
    enabled: fetchDivergenceSummary,
  });

  const divergenceClientsQuery = useQuery({
    queryKey: studioBaseTemplateQueryKeys.divergenceClients(templateKey, divergenceClientsPath),
    queryFn: () => fetchStudioBaseTemplateDivergenceClients(templateKey, divergenceClientsPath),
    enabled: Boolean(divergenceClientsPath),
  });

  const saveMutation = useMutation({
    mutationFn: (input: SaveStudioBaseTemplateInput) => putStudioBaseTemplateRecord(templateKey, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioBaseTemplateQueryKeys.record(templateKey) });
    },
  });

  return {
    templateKey,

    /** Dados validados do GET do template central. */
    record: recordQuery.data,
    isLoadingRecord: recordQuery.isPending,
    isFetchingRecord: recordQuery.isFetching,
    recordError: recordQuery.error,
    refetchRecord: recordQuery.refetch,

    /** PUT do template central; em sucesso invalida queries desse `templateKey`. */
    saveTemplate: saveMutation.mutate,
    saveTemplateAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    lastSavedRecord: saveMutation.data,

    /** GET agregado de divergência (`fetchDivergenceSummary` deve ser true). */
    divergenceSummary: divergenceSummaryQuery.data,
    isLoadingDivergenceSummary: divergenceSummaryQuery.isPending,
    isFetchingDivergenceSummary: divergenceSummaryQuery.isFetching,
    divergenceSummaryError: divergenceSummaryQuery.error,
    refetchDivergenceSummary: divergenceSummaryQuery.refetch,

    /** GET de clientes divergentes no path (`divergenceClientsForPath` não vazio). */
    divergenceClients: divergenceClientsQuery.data,
    isLoadingDivergenceClients: divergenceClientsQuery.isPending,
    isFetchingDivergenceClients: divergenceClientsQuery.isFetching,
    divergenceClientsError: divergenceClientsQuery.error,
    refetchDivergenceClients: divergenceClientsQuery.refetch,
  };
}
