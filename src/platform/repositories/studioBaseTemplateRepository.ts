import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { ContentSchema, type Content } from '../../content/schema.js';
import {
  StudioBaseTemplateRecordSchema,
  type StudioBaseTemplateRecord,
} from '../contracts/studioTemplateInheritance.js';

const DEFAULT_BASE_TEMPLATES_DIR = path.resolve('data', 'studio', 'base-templates');
const DEFAULT_SEED_CONTENT_PATH = path.resolve('content', 'content.json');

/** Chave canônica do template central Estilo 1 (V1). Novas chaves no futuro: `style-2`, etc. */
export const STUDIO_BASE_TEMPLATE_KEY_STYLE_1 = 'style-1' as const;

const TemplateKeySchema = z.string().trim().min(1).regex(/^[^/\\]+$/);

function parseTemplateKey(templateKey: string): string {
  return TemplateKeySchema.parse(templateKey);
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Conteúdo mínimo válido usado quando não há `content/content.json` ou o seed falha na validação.
 * Mantido explícito para não depender de arquivos externos em ambientes mínimos.
 */
function createMinimalStyle1SeedContent(): Content {
  return ContentSchema.parse({
    global: {
      brand: '{{brand}}',
      city: '{{city}}',
      whatsappE164: '{{whatsappE164}}',
      cnpj: '',
      address: '',
      siteUrl: '{{siteUrl}}',
    },
    seo: {
      title: '{{brand}} | {{city}}',
      description: 'Template central Estilo 1 — personalize no Studio.',
      canonical: '{{siteUrl}}/',
      ogImage: '/hero-solar-panels.jpg',
      jsonLd: {},
    },
    hero: {
      headline: 'Energia solar em {{city}}',
      subheadline: 'Template base Estilo 1.',
      ctaLabel: 'Solicitar orçamento',
      background: '/hero-solar-panels.jpg',
    },
    benefits: [
      {
        icon: 'sun',
        title: 'Benefício exemplo',
        text: 'Substitua no template central.',
      },
    ],
    showcase: {
      projects: [],
    },
  });
}

async function tryLoadSeedContent(seedPath: string): Promise<Content | null> {
  let raw: string;
  try {
    raw = await fs.readFile(seedPath, 'utf-8');
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }

  try {
    return ContentSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function resolveDefaultStyle1Content(seedPath: string): Promise<Content> {
  const fromFile = await tryLoadSeedContent(seedPath);
  if (fromFile) {
    return fromFile;
  }
  return createMinimalStyle1SeedContent();
}

export interface StudioBaseTemplateRepository {
  /**
   * Lê `data/studio/base-templates/<templateKey>.json`.
   * Retorna `null` se o arquivo não existir; demais erros de I/O propagam.
   * JSON inválido ou fora do schema: o `parse` do Zod lança.
   */
  getByTemplateKey(templateKey: string): Promise<StudioBaseTemplateRecord | null>;
  /** Persiste o registro em `<record.styleId>.json` sob o diretório configurado. */
  save(record: StudioBaseTemplateRecord): Promise<StudioBaseTemplateRecord>;
  /**
   * Garante que exista um arquivo válido para `style-1` (V1).
   * Se já existir e for válido, devolve o registro existente sem sobrescrever.
   */
  ensureDefaultStyle1Exists(): Promise<StudioBaseTemplateRecord>;
}

export type CreateStudioBaseTemplateRepositoryParams = {
  baseTemplatesDir?: string;
  /** Caminho opcional para JSON de seed (default: `content/content.json` resolvido a partir do cwd). */
  seedContentPath?: string;
};

export function createStudioBaseTemplateRepository(
  params: CreateStudioBaseTemplateRepositoryParams = {},
): StudioBaseTemplateRepository {
  const baseTemplatesDir = params.baseTemplatesDir ?? DEFAULT_BASE_TEMPLATES_DIR;
  const seedContentPath = params.seedContentPath ?? DEFAULT_SEED_CONTENT_PATH;

  const getFilePathForTemplateKey = (templateKey: string) =>
    path.join(baseTemplatesDir, `${parseTemplateKey(templateKey)}.json`);

  const getByTemplateKey = async (
    templateKey: string,
  ): Promise<StudioBaseTemplateRecord | null> => {
    const key = parseTemplateKey(templateKey);
    const filePath = getFilePathForTemplateKey(key);

    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    return StudioBaseTemplateRecordSchema.parse(JSON.parse(fileContent));
  };

  const save = async (record: StudioBaseTemplateRecord): Promise<StudioBaseTemplateRecord> => {
    const validated = StudioBaseTemplateRecordSchema.parse(record);
    const filePath = getFilePathForTemplateKey(validated.styleId);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');

    return validated;
  };

  const ensureDefaultStyle1Exists = async (): Promise<StudioBaseTemplateRecord> => {
    const key = STUDIO_BASE_TEMPLATE_KEY_STYLE_1;
    const existing = await getByTemplateKey(key);
    if (existing) {
      return existing;
    }

    const content = await resolveDefaultStyle1Content(seedContentPath);
    const ts = nowIsoTimestamp();
    const record: StudioBaseTemplateRecord = {
      styleId: key,
      content,
      updatedAt: ts,
      createdAt: ts,
    };

    return save(record);
  };

  return {
    getByTemplateKey,
    save,
    ensureDefaultStyle1Exists,
  };
}
