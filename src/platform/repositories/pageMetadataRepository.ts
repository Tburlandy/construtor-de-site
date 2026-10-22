import fs from 'node:fs/promises';
import path from 'node:path';
import {
  StudioPageMetadataSchema,
  type StudioPageMetadata,
} from '../contracts/studioPages.js';

const DEFAULT_ROOT = path.resolve('data', 'projects');

export interface PageMetadataRepository {
  listByClientId(clientId: string): Promise<StudioPageMetadata[]>;
  getByPageId(pageId: string): Promise<StudioPageMetadata | null>;
  save(page: StudioPageMetadata): Promise<StudioPageMetadata>;
  setDefault(clientId: string, pageId: string): Promise<void>;
}

export function createPageMetadataRepository(params: { projectsRootDir?: string } = {}): PageMetadataRepository {
  const root = params.projectsRootDir ?? DEFAULT_ROOT;
  const pagesDir = (clientId: string) => path.join(root, clientId, 'pages');
  const metadataFile = (clientId: string, pageId: string) => path.join(pagesDir(clientId), pageId, 'metadata.json');

  async function listByClientId(clientId: string): Promise<StudioPageMetadata[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(pagesDir(clientId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const pages = await Promise.all(entries.map(async (pageId) => {
      try {
        const raw = await fs.readFile(metadataFile(clientId, pageId), 'utf8');
        return StudioPageMetadataSchema.parse(JSON.parse(raw));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    }));
    return pages.filter((page): page is StudioPageMetadata => Boolean(page))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name, 'pt-BR'));
  }

  async function getByPageId(pageId: string): Promise<StudioPageMetadata | null> {
    let clients: string[];
    try {
      clients = await fs.readdir(root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    for (const clientId of clients) {
      try {
        const raw = await fs.readFile(metadataFile(clientId, pageId), 'utf8');
        return StudioPageMetadataSchema.parse(JSON.parse(raw));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return null;
  }

  async function save(page: StudioPageMetadata): Promise<StudioPageMetadata> {
    const parsed = StudioPageMetadataSchema.parse(page);
    const file = metadataFile(parsed.clientId, parsed.pageId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
    return parsed;
  }

  async function setDefault(clientId: string, pageId: string): Promise<void> {
    const pages = await listByClientId(clientId);
    const target = pages.find((page) => page.pageId === pageId);
    if (!target) throw new Error('Página não encontrada para o cliente');
    const now = new Date().toISOString();
    for (const page of pages) {
      if (page.isDefault !== (page.pageId === pageId)) {
        await save({ ...page, isDefault: page.pageId === pageId, updatedAt: now });
      }
    }
  }

  return { listByClientId, getByPageId, save, setDefault };
}
