import type { ProjectMetadataRepository } from '../../repositories/projectMetadataRepository.js';
import type { ProjectContentRepository } from '../../repositories/projectContentRepository.js';

export type CrossClientContaminationEvidence = {
  foreignClientId: string;
  field: string;
  value: string;
};

export type CrossClientContaminationAuditResult = {
  ok: boolean;
  evidence: CrossClientContaminationEvidence[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function addCandidate(
  candidates: Array<{ field: string; value: string }>,
  field: string,
  value: unknown,
): void {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 5) return;
  candidates.push({ field, value: trimmed });
}

export async function runCrossClientContaminationAudit(params: {
  clientId: string;
  artifact: unknown;
  projectMetadataRepository: ProjectMetadataRepository;
  projectContentRepository: ProjectContentRepository;
}): Promise<CrossClientContaminationAuditResult> {
  const serialized = JSON.stringify(params.artifact).toLocaleLowerCase('pt-BR');
  const clients = await params.projectMetadataRepository.list();
  const evidence: CrossClientContaminationEvidence[] = [];

  for (const client of clients) {
    if (client.projectId === params.clientId) continue;
    const row = await params.projectContentRepository.getByProjectId(client.projectId);
    const root = asRecord(row?.content);
    const global = asRecord(root.global);

    const candidates: Array<{ field: string; value: string }> = [];
    addCandidate(candidates, 'brand', global.brand);
    addCandidate(candidates, 'siteUrl', global.siteUrl);
    addCandidate(candidates, 'whatsappE164', global.whatsappE164);
    addCandidate(candidates, 'businessPhone', global.businessPhone);
    addCandidate(candidates, 'cnpj', global.cnpj);
    addCandidate(candidates, 'address', global.address);
    addCandidate(candidates, 'gtmId', global.gtmId);
    addCandidate(candidates, 'formId', global.formId);
    addCandidate(candidates, 'formName', global.formName);
    addCandidate(candidates, 'canalId', global.canalId);
    addCandidate(candidates, 'webhookUrl', global.webhookUrl);
    addCandidate(candidates, 'secondaryWebhookUrl', global.secondaryWebhookUrl);
    const logo = asRecord(global.logo);
    addCandidate(candidates, 'logo', logo.originalUrl ?? logo.url ?? logo.src);
    const seo = asRecord(root.seo);
    addCandidate(candidates, 'canonical', seo.canonical);
    addCandidate(candidates, 'ogImage', typeof seo.ogImage === 'string' ? seo.ogImage : asRecord(seo.ogImage).url);

    for (const candidate of candidates) {
      if (serialized.includes(candidate.value.toLocaleLowerCase('pt-BR'))) {
        evidence.push({
          foreignClientId: client.projectId,
          field: candidate.field,
          value: candidate.value,
        });
      }
    }
  }

  return { ok: evidence.length === 0, evidence };
}
