import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Content } from '@/content/schema';
import { ContentSchema } from '@/content/schema';
import { StudioTemplateContentPathSchema } from '@/platform/contracts/studioTemplateInheritance';

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

const LegacyInheritanceReasonSchema = z.enum([
  'no_template_state',
  'state_project_mismatch',
  'unsupported_style_id',
]);

const ProjectContentInheritanceMetaInheritanceSchema = z.object({
  mode: z.literal('inheritance'),
  styleId: z.string(),
  inheritedBaseline: ContentSchema,
  overriddenPaths: z.array(z.string()),
  appliedOverrideCount: z.number().int().nonnegative(),
});

const ProjectContentInheritanceMetaLegacySchema = z.object({
  mode: z.literal('legacy'),
  reason: LegacyInheritanceReasonSchema,
});

/** Metadados de herança devolvidos pelo GET `.../content?includeInheritanceMeta=true`. */
export const ProjectContentInheritanceMetaSchema = z.discriminatedUnion('mode', [
  ProjectContentInheritanceMetaInheritanceSchema,
  ProjectContentInheritanceMetaLegacySchema,
]);
export type ProjectContentInheritanceMeta = z.infer<typeof ProjectContentInheritanceMetaSchema>;

export const ProjectContentWithInheritanceResponseSchema = z.object({
  content: ContentSchema,
  inheritanceMeta: ProjectContentInheritanceMetaSchema,
});
export type ProjectContentWithInheritanceResponse = z.infer<
  typeof ProjectContentWithInheritanceResponseSchema
>;

const ResetTemplateSectionIdSchema = z.string().trim().min(1).regex(/^[^./\\]+$/);

/** Chaves React Query para invalidação (ex. após salvar conteúdo noutro fluxo). */
export const clientTemplateInheritanceQueryKeys = {
  all: ['client', 'template-inheritance'] as const,
  project: (projectId: string) => [...clientTemplateInheritanceQueryKeys.all, projectId] as const,
};

function projectContentWithMetaUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/content?includeInheritanceMeta=true`;
}

function resetFieldUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/template-state/reset-field`;
}

function resetSectionUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/template-state/reset-section`;
}

function parseContentWithInheritancePayload(payload: unknown): ProjectContentWithInheritanceResponse {
  if (
    payload &&
    typeof payload === 'object' &&
    'inheritanceMeta' in payload &&
    'content' in payload
  ) {
    return ProjectContentWithInheritanceResponseSchema.parse(payload);
  }
  // Dev (`vite-plugin-studio`): GET pode devolver só `Content` sem envelope — trata-se como legado na UI.
  return {
    content: ContentSchema.parse(payload),
    inheritanceMeta: { mode: 'legacy', reason: 'no_template_state' },
  };
}

async function fetchProjectContentWithInheritance(
  projectId: string,
): Promise<ProjectContentWithInheritanceResponse> {
  const response = await fetch(projectContentWithMetaUrl(projectId));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao carregar herança do cliente.'));
  }
  return parseContentWithInheritancePayload(payload);
}

async function postResetField(projectId: string, path: string): Promise<Content> {
  const parsedPath = StudioTemplateContentPathSchema.parse(path.trim());
  const response = await fetch(resetFieldUrl(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: parsedPath }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao reverter o campo ao padrão herdado.'));
  }
  return ContentSchema.parse(payload);
}

async function postResetSection(projectId: string, sectionId: string): Promise<Content> {
  const parsedSectionId = ResetTemplateSectionIdSchema.parse(sectionId);
  const response = await fetch(resetSectionUrl(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionId: parsedSectionId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Erro ao reverter a seção ao padrão herdado.'));
  }
  return ContentSchema.parse(payload);
}

export type UseClientTemplateInheritanceOptions = {
  /** Quando false, não dispara o GET com metadados. */
  enabled?: boolean;
};

/**
 * Herança do template no builder do cliente: metadados do GET com `includeInheritanceMeta`,
 * `isInherited(path)` e resets via POST (sem reimplementar regras do backend).
 */
export function useClientTemplateInheritance(
  projectId: string | undefined,
  options?: UseClientTemplateInheritanceOptions,
) {
  const queryClient = useQueryClient();
  const id = projectId?.trim() ?? '';
  const enabled = Boolean(id) && (options?.enabled ?? true);

  const query = useQuery({
    queryKey: clientTemplateInheritanceQueryKeys.project(id),
    queryFn: () => fetchProjectContentWithInheritance(id),
    enabled,
  });

  const inheritanceMeta = query.data?.inheritanceMeta;
  const resolvedContent = query.data?.content;

  const overriddenPathsSet = useMemo(() => {
    if (inheritanceMeta?.mode !== 'inheritance') {
      return null;
    }
    return new Set(inheritanceMeta.overriddenPaths);
  }, [inheritanceMeta]);

  const isInheritanceActive = inheritanceMeta?.mode === 'inheritance';

  /**
   * `true` = path sem override (herdado do template resolvido).
   * `false` = path com override explícito.
   * `null` = modo legado ou path vazio (UI não deve inferir badge).
   */
  const isInherited = useCallback(
    (path: string): boolean | null => {
      const normalized = path.trim();
      if (!normalized) {
        return null;
      }
      if (inheritanceMeta?.mode !== 'inheritance' || !overriddenPathsSet) {
        return null;
      }
      return !overriddenPathsSet.has(normalized);
    },
    [inheritanceMeta, overriddenPathsSet],
  );

  const invalidate = useCallback(() => {
    if (!id) return;
    void queryClient.invalidateQueries({ queryKey: clientTemplateInheritanceQueryKeys.project(id) });
  }, [id, queryClient]);

  const resetFieldMutation = useMutation({
    mutationFn: (path: string) => {
      if (!id) {
        throw new Error('projectId é obrigatório para resetField.');
      }
      return postResetField(id, path);
    },
    onSuccess: invalidate,
  });

  const resetSectionMutation = useMutation({
    mutationFn: (sectionId: string) => {
      if (!id) {
        throw new Error('projectId é obrigatório para resetSection.');
      }
      return postResetSection(id, sectionId);
    },
    onSuccess: invalidate,
  });

  return {
    projectId: id,

    /** Conteúdo resolvido do último GET (alinhado ao que o builder já usa). */
    content: resolvedContent,
    /** Metadados de herança ou modo legado. */
    inheritanceMeta,
    /** `true` quando há `template-state` Estilo 1 e baseline herdado. */
    isInheritanceActive,

    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    /** Ver {@link isInherited} — só significativo com `isInheritanceActive`. */
    isInherited,

    /** POST `template-state/reset-field` com `{ path }`. */
    resetField: resetFieldMutation.mutate,
    resetFieldAsync: resetFieldMutation.mutateAsync,
    isResettingField: resetFieldMutation.isPending,
    resetFieldError: resetFieldMutation.error,
    lastResetFieldContent: resetFieldMutation.data,

    /** POST `template-state/reset-section` com `{ sectionId }` (ex. id do builder: `hero`, `seo`). */
    resetSection: resetSectionMutation.mutate,
    resetSectionAsync: resetSectionMutation.mutateAsync,
    isResettingSection: resetSectionMutation.isPending,
    resetSectionError: resetSectionMutation.error,
    lastResetSectionContent: resetSectionMutation.data,
  };
}
