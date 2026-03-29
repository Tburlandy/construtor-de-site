export type BuilderTabId = 'data' | 'layout';

export type BuilderSectionId =
  | 'global'
  | 'seo'
  | 'hero'
  | 'benefits'
  | 'showcase'
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
    title: 'Obrigatórios',
    description: 'Marca, cidade e dados globais do projeto.',
    group: 'Obrigatórios',
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
    description: 'Título principal, subtítulo e CTA inicial.',
    group: 'Conteúdo',
    editable: true,
  },
  {
    id: 'benefits',
    title: 'Benefícios',
    description: 'Blocos de benefício da proposta.',
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
    id: 'media',
    title: 'Mídia',
    description: 'Imagens auxiliares do layout atual.',
    group: 'Conteúdo',
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
