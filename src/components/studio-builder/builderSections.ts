export type BuilderTabId = 'data' | 'layout';

export type BuilderSectionId =
  | 'global'
  | 'seo'
  | 'hero'
  | 'financing'
  | 'benefits'
  | 'proofBar'
  | 'fullService'
  | 'howItWorks'
  | 'showcase'
  | 'faq'
  | 'media'
  | 'cta'
  | 'footer';

export interface BuilderSection {
  id: BuilderSectionId;
  title: string;
  description: string;
  group: 'Obrigatórios' | 'Conteúdo' | 'Complementos';
  editable: boolean;
}

export const BUILDER_SECTIONS: BuilderSection[] = [
  {
    id: 'global',
    title: 'Menu',
    description: 'Navegação e CTAs do cabeçalho.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'seo',
    title: 'SEO',
    description: 'Metatags, canonical e Open Graph.',
    group: 'Obrigatórios',
    editable: true,
  },
  {
    id: 'hero',
    title: 'Hero',
    description: 'Título principal, CTAs e indicadores.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'financing',
    title: 'Pagamento',
    description: 'Textos da seção de condições de pagamento.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'fullService',
    title: 'Serviço Completo',
    description: 'Textos e lista de serviços da seção completa.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'proofBar',
    title: 'Prova Social',
    description: 'Título, cards e CTAs da seção de avaliações.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'showcase',
    title: 'Projetos',
    description: 'Cards de cases e resultados.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'howItWorks',
    title: 'Como Funciona',
    description: 'Título e passos da geração solar.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'faq',
    title: 'Perguntas frequentes',
    description: 'Título da seção e lista de perguntas e respostas.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'benefits',
    title: 'Benefícios (legado)',
    description: 'Campos antigos usados como fallback de serviço.',
    group: 'Complementos',
    editable: true,
  },
  {
    id: 'media',
    title: 'Mídia',
    description: 'Ajustes de imagem legados (fallback).',
    group: 'Complementos',
    editable: true,
  },
  {
    id: 'cta',
    title: 'CTA',
    description: 'Área reservada para próximos cards.',
    group: 'Complementos',
    editable: false,
  },
  {
    id: 'footer',
    title: 'Rodapé',
    description: 'Área reservada para próximos cards.',
    group: 'Complementos',
    editable: false,
  },
];

export function getBuilderSectionById(sectionId: BuilderSectionId): BuilderSection {
  return BUILDER_SECTIONS.find((section) => section.id === sectionId) ?? BUILDER_SECTIONS[0];
}
