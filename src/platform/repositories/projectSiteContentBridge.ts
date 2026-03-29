import { ContentSchema, type Content } from '../../content/schema.js';
import {
  ProjectContentRecordSchema,
  type ProjectContentRecord,
} from '../contracts/index.js';

/** Versão lógica do envelope `ProjectContentRecord` para evolução futura do arquivo. */
export const PROJECT_SITE_CONTENT_RECORD_SCHEMA_VERSION = '1';

/**
 * Ponte entre o payload tipado do site (`Content`) e o registro persistido por projeto.
 * Valida com `ContentSchema` na fronteira, conforme orientação do namespace `platform/contracts`.
 */
export function buildProjectContentRecord(params: {
  projectId: string;
  content: Content;
  updatedAt?: string;
  schemaVersion?: string;
}): ProjectContentRecord {
  const content = ContentSchema.parse(params.content);
  const updatedAt = params.updatedAt ?? new Date().toISOString();
  return ProjectContentRecordSchema.parse({
    projectId: params.projectId,
    schemaVersion: params.schemaVersion ?? PROJECT_SITE_CONTENT_RECORD_SCHEMA_VERSION,
    content: content as ProjectContentRecord['content'],
    updatedAt,
  });
}

/** Extrai e valida o `Content` embutido em um registro persistido. */
export function siteContentFromRecord(record: ProjectContentRecord): Content {
  return ContentSchema.parse(record.content);
}

/** Interpreta o JSON no mesmo formato que `content/content.json` (sem envelope de projeto). */
export function parseGlobalSiteContentJson(data: unknown): Content {
  return ContentSchema.parse(data);
}
