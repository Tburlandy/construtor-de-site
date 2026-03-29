import { ContentSchema, type Content } from '../../content/schema';
import {
  ProjectSeoConfigSchema,
  type ProjectId,
  type ProjectSeoConfig,
} from '../contracts';

type SiteSeo = Content['seo'];

/** Extrai SEO de `Content` para o registro persistido dedicado (`seo.json`). */
export function buildProjectSeoConfig(params: {
  projectId: ProjectId;
  seo: SiteSeo;
  updatedAt?: string;
}): ProjectSeoConfig {
  const parsedSeo = ContentSchema.shape.seo.parse(params.seo);
  return ProjectSeoConfigSchema.parse({
    projectId: params.projectId,
    title: parsedSeo.title,
    description: parsedSeo.description,
    canonical: parsedSeo.canonical,
    ogImage: parsedSeo.ogImage,
    jsonLd: parsedSeo.jsonLd,
    updatedAt: params.updatedAt ?? new Date().toISOString(),
  });
}

/** Rehidrata o formato `content.seo` a partir do registro dedicado de SEO. */
export function siteSeoFromProjectSeoConfig(config: ProjectSeoConfig): SiteSeo {
  const parsed = ProjectSeoConfigSchema.parse(config);
  return ContentSchema.shape.seo.parse({
    title: parsed.title,
    description: parsed.description,
    canonical: parsed.canonical,
    ogImage: parsed.ogImage,
    jsonLd: parsed.jsonLd ?? {},
  });
}
