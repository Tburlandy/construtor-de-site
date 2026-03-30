import { z } from 'zod';

// Schema para benefícios
const BenefitSchema = z.object({
  icon: z.string(),
  title: z.string(),
  text: z.string(),
});

const ProjectImageLayoutSchema = z.object({
  scale: z.number().min(0.4).max(2.5).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
});

// Schema para projetos/showcase
const ProjectSchema = z.object({
  image: z.string(),
  tipo: z.enum(['Residencial', 'Comercial']),
  localizacao: z.string(),
  modulos: z.number().min(0),
  potenciaModulo: z.number().min(0),
  economia: z.number().min(0),
  imageLayout: ProjectImageLayoutSchema.optional(),
});

const ShowcaseSchema = z.object({
  titleHighlight: z.string().optional(),
  titleSuffix: z.string().optional(),
  subtitle: z.string().optional(),
  labels: z
    .object({
      location: z.string(),
      system: z.string(),
      annualSavings: z.string(),
    })
    .optional(),
  projects: z.array(ProjectSchema),
});

const LogoImageLayoutSchema = z.object({
  scale: z.number().min(0.6).max(2.5).optional(),
  x: z.number().min(-120).max(120).optional(),
  y: z.number().min(-80).max(80).optional(),
});

const CoverImageLayoutSchema = z.object({
  scale: z.number().min(0.4).max(2.5).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
});

const StatItemSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const SimpleTextItemSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const HeaderMenuItemSchema = z.object({
  sectionId: z.string(),
  label: z.string(),
});

const ImageLayoutSchema = z.object({
  logo: LogoImageLayoutSchema.optional(),
  heroBackground: CoverImageLayoutSchema.optional(),
  howItWorks: CoverImageLayoutSchema.optional(),
  proofBar: CoverImageLayoutSchema.optional(),
  fullService: CoverImageLayoutSchema.optional(),
});

/** Blocos da landing que podem ser ocultados no site (presença na lista = oculto). */
export const HIDDEN_PAGE_SECTION_IDS = [
  'hero',
  'financing',
  'fullService',
  'proofBar',
  'showcase',
  'howItWorks',
] as const;

export type HiddenPageSectionId = (typeof HIDDEN_PAGE_SECTION_IDS)[number];

export const HiddenPageSectionIdSchema = z.enum(HIDDEN_PAGE_SECTION_IDS);

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
    logo: z.string().optional(),
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
    secondaryCtaLabel: z.string().optional(),
    floatingCtaLabel: z.string().optional(),
    stats: z.array(StatItemSchema).optional(),
    background: z.string(),
  }),
  header: z
    .object({
      menu: z.array(HeaderMenuItemSchema).optional(),
      desktopCtaLabel: z.string().optional(),
      mobileCtaLabel: z.string().optional(),
      mobileCompactCtaLabel: z.string().optional(),
    })
    .optional(),
  financing: z
    .object({
      badge: z.string(),
      titlePrefix: z.string(),
      titleHighlight: z.string(),
      subtitle: z.string(),
      items: z.array(SimpleTextItemSchema),
      ctaLabel: z.string(),
    })
    .optional(),
  benefits: z.array(BenefitSchema),
  showcase: ShowcaseSchema,
  howItWorks: z.object({
    image: z.string(),
    imageAlt: z.string().optional(),
    titlePrefix: z.string().optional(),
    titleHighlight: z.string().optional(),
    subtitle: z.string().optional(),
    steps: z
      .array(
        z.object({
          number: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
  }).optional(),
  proofBar: z.object({
    image: z.string(),
    titlePrefix: z.string().optional(),
    titleHighlight: z.string().optional(),
    titleSuffix: z.string().optional(),
    description: z.string().optional(),
    cards: z.array(SimpleTextItemSchema).optional(),
    primaryCtaLabel: z.string().optional(),
    secondaryCtaLabel: z.string().optional(),
    imageAlt: z.string().optional(),
  }).optional(),
  fullService: z.object({
    image: z.string(),
    badge: z.string().optional(),
    titlePrefix: z.string().optional(),
    titleHighlight: z.string().optional(),
    description: z.string().optional(),
    services: z.array(SimpleTextItemSchema).optional(),
    ctaLabel: z.string().optional(),
    imageAlt: z.string().optional(),
  }).optional(),
  imageLayout: ImageLayoutSchema.optional(),
  hiddenPageSections: z.array(HiddenPageSectionIdSchema).optional(),
});

export type Content = z.infer<typeof ContentSchema>;
export type Benefit = z.infer<typeof BenefitSchema>;
export type Testimonial = z.infer<typeof TestimonialSchema>;
export type Expert = z.infer<typeof ExpertSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type LogoImageLayout = z.infer<typeof LogoImageLayoutSchema>;
export type CoverImageLayout = z.infer<typeof CoverImageLayoutSchema>;
export type ImageLayout = z.infer<typeof ImageLayoutSchema>;
