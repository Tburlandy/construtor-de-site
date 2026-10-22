import type { SupabaseClient } from '@supabase/supabase-js';
import type { Content } from '../../../content/schema.js';
import { exportClientZip } from '../clientExportService.js';
import type { PagesService } from './pagesService.js';

function resolveDomain(content: Content): string {
  const siteUrl = content.global.siteUrl?.trim();
  if (siteUrl) {
    try { return new URL(siteUrl).origin; } catch { /* fall through */ }
  }
  const canonical = content.seo.canonical?.trim();
  if (canonical) {
    try { return new URL(canonical).origin; } catch { /* fall through */ }
  }
  throw new Error('Domínio do cliente não configurado para exportação.');
}

export async function exportPageZip(params: {
  clientId: string;
  pageId: string;
  pagesService: PagesService;
  supabaseClient: SupabaseClient | null;
  exportsBucket: string;
}) {
  const prepared = await params.pagesService.preparePageExport(params.clientId, params.pageId);
  const content = prepared.content as Content;
  const result = await exportClientZip({
    clientIdRaw: params.clientId,
    pageIdRaw: params.pageId,
    content,
    buildConfig: {
      basePath: prepared.page.publicPath,
      domain: resolveDomain(content),
    },
    supabaseClient: params.supabaseClient,
    exportsBucket: params.exportsBucket,
  });
  return {
    ...result,
    page: prepared.page,
    validation: prepared.validation,
    contamination: prepared.contamination,
  };
}
