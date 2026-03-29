import { z } from 'zod';

// Schema para benefícios
const BenefitSchema = z.object({
  icon: z.string(),
  title: z.string(),
  text: z.string(),
});

// Schema para projetos/showcase
const ProjectSchema = z.object({
  image: z.string(),
  tipo: z.enum(['Residencial', 'Comercial']),
  localizacao: z.string(),
  modulos: z.number().min(0),
  potenciaModulo: z.number().min(0),
  economia: z.number().min(0),
});

const ShowcaseSchema = z.object({
  projects: z.array(ProjectSchema),
});

// Schema para especialista
const ExpertSchema = z.object({
  photo: z.string(),
  name: z.string(),
  bio: z.string(),
});

// Schema para depoimentos
const TestimonialSchema = z.object({
  name: z.string(),
  text: z.string(),
  video: z.string().optional(),
  poster: z.string().optional(),
});

// Schema principal de conteúdo
export const ContentSchema = z.object({
  global: z.object({
    brand: z.string(),
    city: z.string(),
    whatsappE164: z.string(),
    cnpj: z.string(),
    address: z.string(),
    siteUrl: z.string(),
    gtmId: z.string().optional(),
    webhookUrl: z.string().optional(),
    secondaryWebhookUrl: z.string().optional(),
    formId: z.string().optional(),
    formName: z.string().optional(),
    canalId: z.string().optional(),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonical: z.string(),
    ogImage: z.string(),
    jsonLd: z.any(), // LocalBusiness schema
  }),
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
    ctaLabel: z.string(),
    background: z.string(),
  }),
  benefits: z.array(BenefitSchema),
  showcase: ShowcaseSchema,
  howItWorks: z.object({
    image: z.string(),
  }).optional(),
  proofBar: z.object({
    image: z.string(),
  }).optional(),
  fullService: z.object({
    image: z.string(),
  }).optional(),
});

export type Content = z.infer<typeof ContentSchema>;
export type Benefit = z.infer<typeof BenefitSchema>;
export type Testimonial = z.infer<typeof TestimonialSchema>;
export type Expert = z.infer<typeof ExpertSchema>;
export type Project = z.infer<typeof ProjectSchema>;
