import { useEffect, useRef, useState } from 'react';
import { Check, LayoutTemplate, Palette, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Benefit, Content, ImageLayout, Project } from '@/content/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { normalizeCoverImageLayout, normalizeLogoImageLayout } from '@/lib/imageLayout';
import { cn } from '@/lib/utils';
import { BUILDER_SECTIONS, type BuilderSectionId, type BuilderTabId } from './builderSections';
import {
  BuilderImageField,
  BuilderImageLayoutControls,
  type BuilderImageLayoutValue,
  builderHintClassName,
  builderInputClassName,
  builderLabelClassName,
  builderPrimaryButtonClassName,
  builderSecondaryButtonClassName,
  builderSelectClassName,
  builderTextAreaClassName,
} from './editors/BuilderEditorFields';

interface BuilderEditorPanelProps {
  content: Content;
  activeSectionId: BuilderSectionId;
  scrollToTopSignal?: number;
  activeTab: BuilderTabId;
  onTabChange: (nextTab: BuilderTabId) => void;
  onSectionChange: (sectionId: BuilderSectionId) => void;
  onContentChange: (updater: (current: Content) => Content) => void;
  onUploadImage: (file: File) => Promise<string>;
  onCreateLayout?: () => void;
}

const ACCORDION_SCROLL_CORRECTION_DELAY_MS = 240;

function clampToPositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function hasImageLayoutEntries(layout: ImageLayout): boolean {
  return Object.values(layout).some(Boolean);
}

type ImageLayoutFieldKey = keyof ImageLayout;

interface LayoutThemeOption {
  id: string;
  name: string;
  description: string;
  accentColorClassName: string;
}

interface LayoutStyleVariant {
  id: string;
  name: string;
  pageCount: number;
  accentColorClassName: string;
}

interface LayoutStyleGroup {
  id: string;
  title: string;
  variants: LayoutStyleVariant[];
}

const LAYOUT_THEME_OPTIONS: LayoutThemeOption[] = [
  {
    id: 'efitec-dark',
    name: 'Efitec Dark',
    description: 'Paleta principal do construtor atual.',
    accentColorClassName: 'bg-[#22d3ee]',
  },
];

const LAYOUT_STYLE_GROUPS: LayoutStyleGroup[] = [];

function formatPageCountLabel(pageCount: number): string {
  return `${pageCount} pág`;
}

const DEFAULT_HERO_STATS = [
  { value: '+1000', label: 'Projetos instalados' },
  { value: '25 anos', label: 'de garantia nas placas' },
  { value: '100%', label: 'de satisfação no Google' },
  { value: '6 anos', label: 'No mercado' },
];

const DEFAULT_FINANCING_ITEMS = [
  { title: '120 dias para começar', description: 'Você só começa a pagar em 4 meses' },
  { title: 'Até 120 parcelas', description: 'Parcelas que cabem no seu bolso com taxas reduzidas' },
  { title: 'Zero de entrada', description: 'Comece a economizar sem desembolso inicial' },
];

const DEFAULT_PROOFBAR_CARDS = [
  {
    title: '100% de satisfação no Google',
    description:
      'São 409 avaliações, não são 10, 20! 409 clientes fizeram questão de comentar a experiência 5 estrelas.',
  },
  {
    title: 'Garantia de 25 anos das placas solares',
    description: 'Proteção do seu investimento',
  },
  {
    title: 'Instalação Rápida',
    description: 'Em poucos dias você terá seu sistema funcionando',
  },
  {
    title: 'Líder em painéis solares em {{city}}',
    description: 'Referência em qualidade e atendimento',
  },
  {
    title: 'Satisfação Garantida',
    description: 'Garantimos o sistema em plena operação',
  },
  {
    title: '+ DE 1000',
    description: 'Clientes atendidos com excelência',
  },
];

const DEFAULT_FULL_SERVICE_ITEMS = [
  { title: 'Projeto Completo', description: 'Dimensionamento técnico e análise de viabilidade' },
  { title: 'Instalação Profissional', description: 'Equipe certificada com NR10 e NR35' },
  { title: 'Homologação ANEEL', description: 'Cuidamos de toda a documentação e aprovação' },
  { title: 'Suporte Completo', description: 'Atendimento local e monitoramento contínuo' },
];

const DEFAULT_HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Captação Solar',
    description:
      'Os painéis fotovoltaicos captam a energia solar e a transformam em corrente elétrica contínua (DC)',
  },
  {
    number: '02',
    title: 'Conversão',
    description:
      'A corrente é enviada aos inversores que transformam a corrente contínua em corrente alternada (AC), a mesma fornecida pelas concessionárias.',
  },
  {
    number: '03',
    title: 'Distribuição',
    description:
      'Os inversores enviam a corrente alternada para o painel central elétrico que alimenta os equipamentos elétricos da instalação.',
  },
  {
    number: '04',
    title: 'Excedente',
    description: 'O excedente de energia produzido é devolvido à rede elétrica local.',
  },
  {
    number: '05',
    title: 'Economia',
    description:
      'A inserção de energia na rede causa a regressão do relógio medidor gerando uma redução do valor da conta de luz.',
  },
];

export function BuilderEditorPanel({
  content,
  activeSectionId,
  scrollToTopSignal = 0,
  activeTab,
  onTabChange,
  onSectionChange,
  onContentChange,
  onUploadImage,
  onCreateLayout,
}: BuilderEditorPanelProps) {
  const [jsonLdDraft, setJsonLdDraft] = useState(() => JSON.stringify(content.seo.jsonLd ?? {}, null, 2));
  const [jsonLdError, setJsonLdError] = useState<string | null>(null);
  const [openSectionId, setOpenSectionId] = useState<BuilderSectionId | undefined>(activeSectionId);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedLayoutThemeId, setSelectedLayoutThemeId] = useState(() => LAYOUT_THEME_OPTIONS[0].id);
  const [selectedLayoutVariantId, setSelectedLayoutVariantId] = useState<string>('');
  const [openLayoutStyleIds, setOpenLayoutStyleIds] = useState<string[]>([]);
  const [localGroups, setLocalGroups] = useState<LayoutStyleGroup[]>(LAYOUT_STYLE_GROUPS);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');

  useEffect(() => {
    setJsonLdDraft(JSON.stringify(content.seo.jsonLd ?? {}, null, 2));
  }, [content.seo.jsonLd]);

  useEffect(() => {
    setOpenSectionId(activeSectionId);

    const node = editorScrollRef.current;
    if (!node) return;

    const scrollToSectionHeader = (behavior: ScrollBehavior) => {
      const target =
        node.querySelector<HTMLElement>(`[data-builder-section-trigger-id="${activeSectionId}"]`) ??
        node.querySelector<HTMLElement>(`[data-builder-section-id="${activeSectionId}"]`);
      if (!target) {
        node.scrollTo({ top: 0, behavior });
        return;
      }
      const targetTop = Math.max(0, target.offsetTop - 8);
      node.scrollTo({ top: targetTop, behavior });
    };

    const timer = window.setTimeout(() => {
      scrollToSectionHeader('smooth');
    }, 0);

    // Corrige o offset após a animação do accordion quando há conteúdo grande.
    const correctionTimer = window.setTimeout(() => {
      scrollToSectionHeader('auto');
    }, ACCORDION_SCROLL_CORRECTION_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(correctionTimer);
    };
  }, [activeSectionId, scrollToTopSignal]);

  const setGlobalField = <K extends keyof Content['global']>(field: K, value: Content['global'][K]) => {
    onContentChange((current) => ({
      ...current,
      global: {
        ...current.global,
        [field]: value,
      },
    }));
  };

  const setSeoField = <K extends keyof Content['seo']>(field: K, value: Content['seo'][K]) => {
    onContentChange((current) => ({
      ...current,
      seo: {
        ...current.seo,
        [field]: value,
      },
    }));
  };

  const setHeroField = <K extends keyof Content['hero']>(field: K, value: Content['hero'][K]) => {
    onContentChange((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [field]: value,
      },
    }));
  };

  const setFinancingField = <K extends keyof NonNullable<Content['financing']>>(
    field: K,
    value: NonNullable<Content['financing']>[K],
  ) => {
    onContentChange((current) => ({
      ...current,
      financing: {
        badge: current.financing?.badge ?? 'Pagamento Facilitado',
        titlePrefix: current.financing?.titlePrefix ?? 'Comece a pagar em',
        titleHighlight: current.financing?.titleHighlight ?? 'abril de 2026',
        subtitle:
          current.financing?.subtitle ??
          'Em até 120 vezes, com 1º pagamento em 120 dias',
        items: current.financing?.items?.length ? current.financing.items : DEFAULT_FINANCING_ITEMS,
        ctaLabel: current.financing?.ctaLabel ?? 'Orçamento gratuito',
        [field]: value,
      },
    }));
  };

  const setImageLayoutField = (field: ImageLayoutFieldKey, value: ImageLayout[ImageLayoutFieldKey] | undefined) => {
    onContentChange((current) => {
      const nextImageLayout: ImageLayout = {
        ...(current.imageLayout ?? {}),
      };

      if (value) {
        nextImageLayout[field] = value;
      } else {
        delete nextImageLayout[field];
      }

      return {
        ...current,
        imageLayout: hasImageLayoutEntries(nextImageLayout) ? nextImageLayout : undefined,
      };
    });
  };

  const logoLayoutControlValue = normalizeLogoImageLayout(content.imageLayout?.logo);
  const heroImageLayoutControlValue = normalizeCoverImageLayout(content.imageLayout?.heroBackground);
  const howItWorksImageLayoutControlValue = normalizeCoverImageLayout(content.imageLayout?.howItWorks);
  const proofBarImageLayoutControlValue = normalizeCoverImageLayout(content.imageLayout?.proofBar);
  const fullServiceImageLayoutControlValue = normalizeCoverImageLayout(content.imageLayout?.fullService);
  const selectedLayoutTheme =
    LAYOUT_THEME_OPTIONS.find((theme) => theme.id === selectedLayoutThemeId) ?? LAYOUT_THEME_OPTIONS[0];
  const selectedLayoutVariant =
    LAYOUT_STYLE_GROUPS.flatMap((group) => group.variants).find(
      (variant) => variant.id === selectedLayoutVariantId,
    );

  const updateCoverLayout = (
    field: 'heroBackground' | 'howItWorks' | 'proofBar' | 'fullService',
    value: BuilderImageLayoutValue,
  ) => {
    setImageLayoutField(field, {
      scale: value.scale,
      x: value.x,
      y: value.y,
    });
  };

  const updateLogoLayout = (value: BuilderImageLayoutValue) => {
    setImageLayoutField('logo', {
      scale: value.scale,
      x: value.x,
      y: value.y,
    });
  };

  const updateBenefit = (index: number, updater: (benefit: Benefit) => Benefit) => {
    onContentChange((current) => ({
      ...current,
      benefits: current.benefits.map((benefit, benefitIndex) =>
        benefitIndex === index ? updater(benefit) : benefit,
      ),
    }));
  };

  const addBenefit = () => {
    onContentChange((current) => ({
      ...current,
      benefits: [...current.benefits, { icon: 'CheckCircle2', title: '', text: '' }],
    }));
  };

  const removeBenefit = (index: number) => {
    onContentChange((current) => ({
      ...current,
      benefits: current.benefits.filter((_, benefitIndex) => benefitIndex !== index),
    }));
  };

  const updateShowcaseProject = (index: number, updater: (project: Project) => Project) => {
    onContentChange((current) => ({
      ...current,
      showcase: {
        projects: current.showcase.projects.map((project, projectIndex) =>
          projectIndex === index ? updater(project) : project,
        ),
      },
    }));
  };

  const addShowcaseProject = () => {
    onContentChange((current) => ({
      ...current,
      showcase: {
        projects: [
          ...current.showcase.projects,
          {
            image: '',
            tipo: 'Residencial',
            localizacao: '',
            modulos: 0,
            potenciaModulo: 0,
            economia: 0,
          },
        ],
      },
    }));
  };

  const removeShowcaseProject = (index: number) => {
    onContentChange((current) => ({
      ...current,
      showcase: {
        projects: current.showcase.projects.filter((_, projectIndex) => projectIndex !== index),
      },
    }));
  };

  const commitJsonLd = () => {
    try {
      const parsed = JSON.parse(jsonLdDraft);
      setJsonLdError(null);
      setSeoField('jsonLd', parsed);
    } catch {
      setJsonLdError('JSON inválido. Corrija a sintaxe antes de salvar.');
    }
  };

  const renderSectionEditor = (sectionId: BuilderSectionId) => {
    if (sectionId === 'global') {
      return (
        <div className="grid gap-4">
          <div className="space-y-2">
            <p className={builderLabelClassName}>Nome da marca</p>
            <input
              className={builderInputClassName}
              value={content.global.brand}
              onChange={(event) => setGlobalField('brand', event.target.value)}
              placeholder="Ex.: EFITEC SOLAR"
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Cidade</p>
            <input
              className={builderInputClassName}
              value={content.global.city}
              onChange={(event) => setGlobalField('city', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>WhatsApp (E.164)</p>
            <input
              className={builderInputClassName}
              value={content.global.whatsappE164}
              onChange={(event) => setGlobalField('whatsappE164', event.target.value)}
              placeholder="5521999999999"
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>URL do site</p>
            <input
              className={builderInputClassName}
              value={content.global.siteUrl}
              onChange={(event) => setGlobalField('siteUrl', event.target.value)}
              placeholder="https://www.exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>CNPJ</p>
            <input
              className={builderInputClassName}
              value={content.global.cnpj}
              onChange={(event) => setGlobalField('cnpj', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Endereço</p>
            <textarea
              className={builderTextAreaClassName}
              rows={3}
              value={content.global.address}
              onChange={(event) => setGlobalField('address', event.target.value)}
            />
          </div>
          <BuilderImageField
            label="Logo"
            description="Logo exibida no cabeçalho do site."
            value={content.global.logo ?? ''}
            onChange={(nextValue) => setGlobalField('logo', nextValue)}
            onUploadImage={onUploadImage}
          />
          <BuilderImageLayoutControls
            mode="logo"
            value={logoLayoutControlValue}
            onChange={updateLogoLayout}
            onReset={() => setImageLayoutField('logo', undefined)}
          />
        </div>
      );
    }

    if (sectionId === 'seo') {
      return (
        <div className="grid gap-4">
          <div className="space-y-2">
            <p className={builderLabelClassName}>Título SEO</p>
            <input
              className={builderInputClassName}
              value={content.seo.title}
              onChange={(event) => setSeoField('title', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Descrição</p>
            <textarea
              className={builderTextAreaClassName}
              rows={3}
              value={content.seo.description}
              onChange={(event) => setSeoField('description', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>URL canônica</p>
            <input
              className={builderInputClassName}
              value={content.seo.canonical}
              onChange={(event) => setSeoField('canonical', event.target.value)}
            />
          </div>
          <BuilderImageField
            label="Imagem OG"
            description="Usada em compartilhamentos de Open Graph."
            value={content.seo.ogImage}
            onChange={(nextValue) => setSeoField('ogImage', nextValue)}
            onUploadImage={onUploadImage}
          />
          <div className="space-y-2">
            <p className={builderLabelClassName}>JSON-LD</p>
            <textarea
              className={cn(builderTextAreaClassName, 'font-mono text-[13px]')}
              rows={10}
              value={jsonLdDraft}
              onChange={(event) => {
                setJsonLdDraft(event.target.value);
                setJsonLdError(null);
              }}
              onBlur={commitJsonLd}
            />
            {jsonLdError ? (
              <p className="text-xs text-[var(--builder-danger)]">{jsonLdError}</p>
            ) : (
              <p className={builderHintClassName}>O JSON é aplicado ao sair do campo.</p>
            )}
          </div>
        </div>
      );
    }

    if (sectionId === 'hero') {
      const heroStats = content.hero.stats?.length ? content.hero.stats : DEFAULT_HERO_STATS;
      return (
        <div className="grid gap-4">
          <div className="space-y-2">
            <p className={builderLabelClassName}>Headline</p>
            <input
              className={builderInputClassName}
              value={content.hero.headline}
              onChange={(event) => setHeroField('headline', event.target.value)}
              placeholder="Use {{city}} quando quiser interpolar cidade"
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Subheadline</p>
            <textarea
              className={builderTextAreaClassName}
              rows={3}
              value={content.hero.subheadline}
              onChange={(event) => setHeroField('subheadline', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>CTA principal</p>
            <input
              className={builderInputClassName}
              value={content.hero.ctaLabel}
              onChange={(event) => setHeroField('ctaLabel', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>CTA secundário</p>
            <input
              className={builderInputClassName}
              value={content.hero.secondaryCtaLabel ?? 'Fale no Whatsapp'}
              onChange={(event) => setHeroField('secondaryCtaLabel', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>CTA flutuante</p>
            <input
              className={builderInputClassName}
              value={content.hero.floatingCtaLabel ?? 'WhatsApp'}
              onChange={(event) => setHeroField('floatingCtaLabel', event.target.value)}
            />
          </div>
          <div className="space-y-3">
            <p className={builderLabelClassName}>Indicadores do Hero</p>
            <div className="space-y-2">
              {heroStats.map((item, index) => (
                <div
                  key={`${item.value}-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-[12px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] p-2.5 sm:grid-cols-2"
                >
                  <input
                    className={builderInputClassName}
                    value={item.value}
                    placeholder="+1000"
                    onChange={(event) =>
                      setHeroField(
                        'stats',
                        heroStats.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, value: event.target.value } : current,
                        ),
                      )
                    }
                  />
                  <input
                    className={builderInputClassName}
                    value={item.label}
                    placeholder="Projetos instalados"
                    onChange={(event) =>
                      setHeroField(
                        'stats',
                        heroStats.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, label: event.target.value } : current,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <BuilderImageField
            label="Imagem de fundo"
            description="Formato recomendado: WebP otimizado."
            value={content.hero.background}
            onChange={(nextValue) => setHeroField('background', nextValue)}
            onUploadImage={onUploadImage}
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={heroImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('heroBackground', nextValue)}
            onReset={() => setImageLayoutField('heroBackground', undefined)}
          />
        </div>
      );
    }

    if (sectionId === 'financing') {
      const financingItems = content.financing?.items?.length ? content.financing.items : DEFAULT_FINANCING_ITEMS;
      return (
        <div className="grid gap-4">
          <div className="space-y-2">
            <p className={builderLabelClassName}>Selo</p>
            <input
              className={builderInputClassName}
              value={content.financing?.badge ?? 'Pagamento Facilitado'}
              onChange={(event) => setFinancingField('badge', event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (prefixo)</p>
              <input
                className={builderInputClassName}
                value={content.financing?.titlePrefix ?? 'Comece a pagar em'}
                onChange={(event) => setFinancingField('titlePrefix', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (destaque)</p>
              <input
                className={builderInputClassName}
                value={content.financing?.titleHighlight ?? 'abril de 2026'}
                onChange={(event) => setFinancingField('titleHighlight', event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Subtítulo</p>
            <textarea
              className={builderTextAreaClassName}
              rows={3}
              value={content.financing?.subtitle ?? 'Em até 120 vezes, com 1º pagamento em 120 dias'}
              onChange={(event) => setFinancingField('subtitle', event.target.value)}
            />
          </div>
          <div className="space-y-3">
            <p className={builderLabelClassName}>Cards de condições</p>
            {financingItems.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="space-y-2 rounded-[12px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] p-3"
              >
                <input
                  className={builderInputClassName}
                  value={item.title}
                  onChange={(event) =>
                    setFinancingField(
                      'items',
                      financingItems.map((current, currentIndex) =>
                        currentIndex === index ? { ...current, title: event.target.value } : current,
                      ),
                    )
                  }
                />
                <textarea
                  className={builderTextAreaClassName}
                  rows={2}
                  value={item.description}
                  onChange={(event) =>
                    setFinancingField(
                      'items',
                      financingItems.map((current, currentIndex) =>
                        currentIndex === index ? { ...current, description: event.target.value } : current,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>CTA</p>
            <input
              className={builderInputClassName}
              value={content.financing?.ctaLabel ?? 'Orçamento gratuito'}
              onChange={(event) => setFinancingField('ctaLabel', event.target.value)}
            />
          </div>
        </div>
      );
    }

    if (sectionId === 'benefits') {
      return (
        <div className="space-y-4">
          {content.benefits.map((benefit, index) => (
            <div key={`${benefit.title}-${index}`} className="rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.55)] p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--builder-text-primary)]">Benefício {index + 1}</p>
                <button
                  type="button"
                  className={cn(builderSecondaryButtonClassName, 'border-[rgba(248,113,113,0.4)] text-[var(--builder-danger)] hover:bg-[var(--builder-danger-surface)]')}
                  onClick={() => removeBenefit(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
              </div>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Ícone</p>
                  <input
                    className={builderInputClassName}
                    value={benefit.icon}
                    onChange={(event) =>
                      updateBenefit(index, (current) => ({ ...current, icon: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Título</p>
                  <input
                    className={builderInputClassName}
                    value={benefit.title}
                    onChange={(event) =>
                      updateBenefit(index, (current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={builderLabelClassName}>Descrição</p>
                  <textarea
                    className={builderTextAreaClassName}
                    rows={2}
                    value={benefit.text}
                    onChange={(event) =>
                      updateBenefit(index, (current) => ({ ...current, text: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className={builderSecondaryButtonClassName} onClick={addBenefit}>
            <Plus className="h-4 w-4" />
            Adicionar benefício
          </button>
        </div>
      );
    }

    if (sectionId === 'proofBar') {
      const cards = content.proofBar?.cards?.length ? content.proofBar.cards : DEFAULT_PROOFBAR_CARDS;
      return (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (prefixo)</p>
              <input
                className={builderInputClassName}
                value={content.proofBar?.titlePrefix ?? 'Escolha a empresa'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    proofBar: { ...(current.proofBar ?? { image: '' }), titlePrefix: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (destaque)</p>
              <input
                className={builderInputClassName}
                value={content.proofBar?.titleHighlight ?? 'mais bem avaliada'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    proofBar: { ...(current.proofBar ?? { image: '' }), titleHighlight: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (sufixo)</p>
              <input
                className={builderInputClassName}
                value={content.proofBar?.titleSuffix ?? 'do Rio de Janeiro e não tenha dor de cabeça'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    proofBar: { ...(current.proofBar ?? { image: '' }), titleSuffix: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Descrição principal</p>
            <textarea
              className={builderTextAreaClassName}
              rows={4}
              value={
                content.proofBar?.description ??
                'SOMOS a empresa com o maior número de avaliação 5 estrelas no estado do Rio de Janeiro, com equipe de Engenharia e Instalação certificada e especializada. Equipe própria, nada de tercerizados. Receba tudo 100% funcionando - Resolvemos toda a burocracia'
              }
              onChange={(event) =>
                onContentChange((current) => ({
                  ...current,
                  proofBar: { ...(current.proofBar ?? { image: '' }), description: event.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-3">
            <p className={builderLabelClassName}>Cards</p>
            {cards.map((card, index) => (
              <div
                key={`${card.title}-${index}`}
                className="space-y-2 rounded-[12px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] p-3"
              >
                <input
                  className={builderInputClassName}
                  value={card.title}
                  onChange={(event) =>
                    onContentChange((current) => ({
                      ...current,
                      proofBar: {
                        ...(current.proofBar ?? { image: '' }),
                        cards: cards.map((currentCard, currentIndex) =>
                          currentIndex === index ? { ...currentCard, title: event.target.value } : currentCard,
                        ),
                      },
                    }))
                  }
                />
                <textarea
                  className={builderTextAreaClassName}
                  rows={2}
                  value={card.description}
                  onChange={(event) =>
                    onContentChange((current) => ({
                      ...current,
                      proofBar: {
                        ...(current.proofBar ?? { image: '' }),
                        cards: cards.map((currentCard, currentIndex) =>
                          currentIndex === index
                            ? { ...currentCard, description: event.target.value }
                            : currentCard,
                        ),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className={builderLabelClassName}>CTA primário</p>
              <input
                className={builderInputClassName}
                value={content.proofBar?.primaryCtaLabel ?? 'Orçamento gratuito'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    proofBar: { ...(current.proofBar ?? { image: '' }), primaryCtaLabel: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className={builderLabelClassName}>CTA secundário</p>
              <input
                className={builderInputClassName}
                value={content.proofBar?.secondaryCtaLabel ?? 'Fale no Whatsapp'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    proofBar: { ...(current.proofBar ?? { image: '' }), secondaryCtaLabel: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <BuilderImageField
            label="Imagem da prova social"
            value={content.proofBar?.image ?? ''}
            onUploadImage={onUploadImage}
            onChange={(nextValue) =>
              onContentChange((current) => ({
                ...current,
                proofBar: { ...(current.proofBar ?? { image: '' }), image: nextValue },
              }))
            }
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={proofBarImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('proofBar', nextValue)}
            onReset={() => setImageLayoutField('proofBar', undefined)}
          />
        </div>
      );
    }

    if (sectionId === 'fullService') {
      const services = content.fullService?.services?.length
        ? content.fullService.services
        : content.benefits.length
          ? content.benefits.map((benefit) => ({ title: benefit.title, description: benefit.text }))
          : DEFAULT_FULL_SERVICE_ITEMS;
      return (
        <div className="grid gap-4">
          <div className="space-y-2">
            <p className={builderLabelClassName}>Selo</p>
            <input
              className={builderInputClassName}
              value={content.fullService?.badge ?? 'Serviço Completo'}
              onChange={(event) =>
                onContentChange((current) => ({
                  ...current,
                  fullService: { ...(current.fullService ?? { image: '' }), badge: event.target.value },
                }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (prefixo)</p>
              <input
                className={builderInputClassName}
                value={content.fullService?.titlePrefix ?? 'Cuidamos de'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    fullService: { ...(current.fullService ?? { image: '' }), titlePrefix: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (destaque)</p>
              <input
                className={builderInputClassName}
                value={content.fullService?.titleHighlight ?? 'tudo para você'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    fullService: { ...(current.fullService ?? { image: '' }), titleHighlight: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Descrição</p>
            <textarea
              className={builderTextAreaClassName}
              rows={3}
              value={
                content.fullService?.description ??
                'Do projeto à instalação, com homologação garantida e suporte completo. Atendimento personalizado em todas as etapas do seu sistema solar.'
              }
              onChange={(event) =>
                onContentChange((current) => ({
                  ...current,
                  fullService: { ...(current.fullService ?? { image: '' }), description: event.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-3">
            <p className={builderLabelClassName}>Lista de serviços</p>
            {services.map((service, index) => (
              <div
                key={`${service.title}-${index}`}
                className="space-y-2 rounded-[12px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] p-3"
              >
                <input
                  className={builderInputClassName}
                  value={service.title}
                  onChange={(event) =>
                    onContentChange((current) => ({
                      ...current,
                      fullService: {
                        ...(current.fullService ?? { image: '' }),
                        services: services.map((currentService, currentIndex) =>
                          currentIndex === index
                            ? { ...currentService, title: event.target.value }
                            : currentService,
                        ),
                      },
                    }))
                  }
                />
                <textarea
                  className={builderTextAreaClassName}
                  rows={2}
                  value={service.description}
                  onChange={(event) =>
                    onContentChange((current) => ({
                      ...current,
                      fullService: {
                        ...(current.fullService ?? { image: '' }),
                        services: services.map((currentService, currentIndex) =>
                          currentIndex === index
                            ? { ...currentService, description: event.target.value }
                            : currentService,
                        ),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>CTA</p>
            <input
              className={builderInputClassName}
              value={content.fullService?.ctaLabel ?? 'Fale no Whatsapp'}
              onChange={(event) =>
                onContentChange((current) => ({
                  ...current,
                  fullService: { ...(current.fullService ?? { image: '' }), ctaLabel: event.target.value },
                }))
              }
            />
          </div>
          <BuilderImageField
            label="Imagem da seção"
            value={content.fullService?.image ?? ''}
            onUploadImage={onUploadImage}
            onChange={(nextValue) =>
              onContentChange((current) => ({
                ...current,
                fullService: { ...(current.fullService ?? { image: '' }), image: nextValue },
              }))
            }
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={fullServiceImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('fullService', nextValue)}
            onReset={() => setImageLayoutField('fullService', undefined)}
          />
        </div>
      );
    }

    if (sectionId === 'howItWorks') {
      const steps = content.howItWorks?.steps?.length ? content.howItWorks.steps : DEFAULT_HOW_IT_WORKS_STEPS;
      return (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (prefixo)</p>
              <input
                className={builderInputClassName}
                value={content.howItWorks?.titlePrefix ?? 'Como'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    howItWorks: { ...(current.howItWorks ?? { image: '' }), titlePrefix: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className={builderLabelClassName}>Título (destaque)</p>
              <input
                className={builderInputClassName}
                value={content.howItWorks?.titleHighlight ?? 'funciona'}
                onChange={(event) =>
                  onContentChange((current) => ({
                    ...current,
                    howItWorks: { ...(current.howItWorks ?? { image: '' }), titleHighlight: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className={builderLabelClassName}>Subtítulo</p>
            <textarea
              className={builderTextAreaClassName}
              rows={2}
              value={content.howItWorks?.subtitle ?? 'Entenda o processo de geração da energia solar fotovoltaica'}
              onChange={(event) =>
                onContentChange((current) => ({
                  ...current,
                  howItWorks: { ...(current.howItWorks ?? { image: '' }), subtitle: event.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-3">
            <p className={builderLabelClassName}>Passos</p>
            {steps.map((step, index) => (
              <div
                key={`${step.number}-${index}`}
                className="space-y-2 rounded-[12px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                  <input
                    className={builderInputClassName}
                    value={step.number}
                    onChange={(event) =>
                      onContentChange((current) => ({
                        ...current,
                        howItWorks: {
                          ...(current.howItWorks ?? { image: '' }),
                          steps: steps.map((currentStep, currentIndex) =>
                            currentIndex === index ? { ...currentStep, number: event.target.value } : currentStep,
                          ),
                        },
                      }))
                    }
                  />
                  <input
                    className={builderInputClassName}
                    value={step.title}
                    onChange={(event) =>
                      onContentChange((current) => ({
                        ...current,
                        howItWorks: {
                          ...(current.howItWorks ?? { image: '' }),
                          steps: steps.map((currentStep, currentIndex) =>
                            currentIndex === index ? { ...currentStep, title: event.target.value } : currentStep,
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <textarea
                  className={builderTextAreaClassName}
                  rows={2}
                  value={step.description}
                  onChange={(event) =>
                    onContentChange((current) => ({
                      ...current,
                      howItWorks: {
                        ...(current.howItWorks ?? { image: '' }),
                        steps: steps.map((currentStep, currentIndex) =>
                          currentIndex === index
                            ? { ...currentStep, description: event.target.value }
                            : currentStep,
                        ),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <BuilderImageField
            label="Imagem principal"
            value={content.howItWorks?.image ?? ''}
            onUploadImage={onUploadImage}
            onChange={(nextValue) =>
              onContentChange((current) => ({
                ...current,
                howItWorks: { ...(current.howItWorks ?? { image: '' }), image: nextValue },
              }))
            }
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={howItWorksImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('howItWorks', nextValue)}
            onReset={() => setImageLayoutField('howItWorks', undefined)}
          />
        </div>
      );
    }

    if (sectionId === 'showcase') {
      return (
        <div className="space-y-4">
          {content.showcase.projects.length === 0 ? (
            <p className={builderHintClassName}>Nenhum projeto cadastrado no showcase.</p>
          ) : null}

          {content.showcase.projects.map((project, index) => (
            <div key={`${project.localizacao}-${index}`} className="rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.55)] p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--builder-text-primary)]">Projeto {index + 1}</p>
                <button
                  type="button"
                  className={cn(builderSecondaryButtonClassName, 'border-[rgba(248,113,113,0.4)] text-[var(--builder-danger)] hover:bg-[var(--builder-danger-surface)]')}
                  onClick={() => removeShowcaseProject(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
              </div>

              <div className="grid gap-3">
                <BuilderImageField
                  label="Imagem"
                  value={project.image}
                  onUploadImage={onUploadImage}
                  onChange={(nextValue) =>
                    updateShowcaseProject(index, (current) => ({ ...current, image: nextValue }))
                  }
                />
                <BuilderImageLayoutControls
                  mode="cover"
                  value={normalizeCoverImageLayout(project.imageLayout)}
                  onChange={(nextValue) =>
                    updateShowcaseProject(index, (current) => ({
                      ...current,
                      imageLayout: {
                        scale: nextValue.scale,
                        x: nextValue.x,
                        y: nextValue.y,
                      },
                    }))
                  }
                  onReset={() =>
                    updateShowcaseProject(index, (current) => ({
                      ...current,
                      imageLayout: undefined,
                    }))
                  }
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Tipo</p>
                    <select
                      className={builderSelectClassName}
                      value={project.tipo}
                      onChange={(event) =>
                        updateShowcaseProject(index, (current) => ({
                          ...current,
                          tipo: event.target.value as Project['tipo'],
                        }))
                      }
                    >
                      <option value="Residencial">Residencial</option>
                      <option value="Comercial">Comercial</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Localização</p>
                    <input
                      className={builderInputClassName}
                      value={project.localizacao}
                      onChange={(event) =>
                        updateShowcaseProject(index, (current) => ({
                          ...current,
                          localizacao: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Módulos</p>
                    <input
                      className={builderInputClassName}
                      value={project.modulos}
                      type="number"
                      min={0}
                      onChange={(event) =>
                        updateShowcaseProject(index, (current) => ({
                          ...current,
                          modulos: clampToPositiveInteger(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Potência (W)</p>
                    <input
                      className={builderInputClassName}
                      value={project.potenciaModulo}
                      type="number"
                      min={0}
                      onChange={(event) =>
                        updateShowcaseProject(index, (current) => ({
                          ...current,
                          potenciaModulo: clampToPositiveInteger(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className={builderLabelClassName}>Economia anual</p>
                    <input
                      className={builderInputClassName}
                      value={project.economia}
                      type="number"
                      min={0}
                      onChange={(event) =>
                        updateShowcaseProject(index, (current) => ({
                          ...current,
                          economia: clampToPositiveInteger(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" className={builderSecondaryButtonClassName} onClick={addShowcaseProject}>
            <Plus className="h-4 w-4" />
            Adicionar projeto
          </button>
        </div>
      );
    }

    if (sectionId === 'media') {
      return (
        <div className="grid gap-4">
          <BuilderImageField
            label="How It Works"
            description="Imagem principal da seção Como Funciona."
            value={content.howItWorks?.image ?? ''}
            onUploadImage={onUploadImage}
            onChange={(nextValue) =>
              onContentChange((current) => ({
                ...current,
                howItWorks: { image: nextValue },
              }))
            }
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={howItWorksImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('howItWorks', nextValue)}
            onReset={() => setImageLayoutField('howItWorks', undefined)}
          />
          <BuilderImageField
            label="Proof Bar"
            description="Imagem de avaliações/autoridade."
            value={content.proofBar?.image ?? ''}
            onUploadImage={onUploadImage}
            onChange={(nextValue) =>
              onContentChange((current) => ({
                ...current,
                proofBar: { image: nextValue },
              }))
            }
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={proofBarImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('proofBar', nextValue)}
            onReset={() => setImageLayoutField('proofBar', undefined)}
          />
          <BuilderImageField
            label="Full Service"
            description="Imagem da seção serviço completo."
            value={content.fullService?.image ?? ''}
            onUploadImage={onUploadImage}
            onChange={(nextValue) =>
              onContentChange((current) => ({
                ...current,
                fullService: { image: nextValue },
              }))
            }
          />
          <BuilderImageLayoutControls
            mode="cover"
            value={fullServiceImageLayoutControlValue}
            onChange={(nextValue) => updateCoverLayout('fullService', nextValue)}
            onReset={() => setImageLayoutField('fullService', undefined)}
          />
        </div>
      );
    }

    return (
      <div className="rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.45)] p-4">
        <p className="text-sm font-medium text-[var(--builder-text-primary)]">Seção em preparação</p>
        <p className="mt-1 text-sm text-[var(--builder-text-secondary)]">
          Esta seção está reservada para próximos cards do builder. Sem impacto no site público atual.
        </p>
      </div>
    );
  };

  return (
    <section className="builder-surface flex h-full min-h-0 flex-col overflow-hidden">
      <header className="border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.96)] to-[rgba(9,18,37,0.92)] px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
          Editor
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="builder-heading text-[22px] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
            Editor de Site
          </h2>
          <div className="inline-flex rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(7,15,31,0.75)] p-1">
            <button
              type="button"
              className={cn(
                'rounded-[var(--builder-radius-pill)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition',
                activeTab === 'data'
                  ? 'bg-[var(--builder-brand-primary)] text-[#020617] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                  : 'text-[var(--builder-text-muted)] hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]',
              )}
              onClick={() => onTabChange('data')}
            >
              Dados
            </button>
            <button
              type="button"
              className={cn(
                'rounded-[var(--builder-radius-pill)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition',
                activeTab === 'layout'
                  ? 'bg-[var(--builder-brand-primary)] text-[#020617] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                  : 'text-[var(--builder-text-muted)] hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]',
              )}
              onClick={() => onTabChange('layout')}
            >
              Layout
            </button>
          </div>
        </div>
      </header>

      <div ref={editorScrollRef} className="builder-scroll flex-1 overflow-y-auto px-2.5 py-2.5">
        {activeTab === 'layout' ? (
          <div className="space-y-3.5">
            <section className="space-y-2 rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.58)] p-3.5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--builder-text-muted)]">
                <Palette className="h-3.5 w-3.5 text-[var(--builder-brand-primary)]" />
                Tema de Cores
              </h3>
              <div className="space-y-2">
                {LAYOUT_THEME_OPTIONS.map((theme) => {
                  const selected = theme.id === selectedLayoutTheme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      className={cn(
                        'w-full rounded-[14px] border px-3.5 py-2.5 text-left transition',
                        selected
                          ? 'border-[rgba(14,165,233,0.7)] bg-[rgba(30,64,95,0.42)] shadow-[0_0_0_1px_rgba(14,165,233,0.45)]'
                          : 'border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] hover:bg-[rgba(15,23,42,0.75)]',
                      )}
                      onClick={() => setSelectedLayoutThemeId(theme.id)}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(15,23,42,0.6)]',
                            theme.accentColorClassName,
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-[var(--builder-text-primary)]">
                            {theme.name}
                          </span>
                          <span className="block text-xs text-[var(--builder-text-secondary)]">
                            {theme.description}
                          </span>
                        </span>
                        {selected ? (
                          <Check className="h-4 w-4 text-[var(--builder-brand-primary)]" aria-hidden="true" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2 rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.58)] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--builder-text-muted)]">
                  Banco de Layouts
                </h3>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-[var(--builder-radius-pill)] border border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.1)] px-3 text-xs font-semibold text-[var(--builder-brand-primary)] transition hover:bg-[rgba(14,165,233,0.18)]"
                  onClick={onCreateLayout}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar novo layout
                </button>
              </div>

              {localGroups.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[var(--builder-border)] bg-[rgba(2,6,23,0.45)] px-4 py-6 text-center">
                  <LayoutTemplate className="mx-auto mb-2 h-7 w-7 text-[var(--builder-text-secondary)]" />
                  <p className="text-sm font-semibold text-[var(--builder-text-secondary)]">Nenhum layout criado</p>
                  <p className="mt-0.5 text-xs text-[var(--builder-text-muted)]">Clique em "Criar novo layout" para começar.</p>
                </div>
              ) : (
                <>
                  <Accordion
                    type="multiple"
                    value={openLayoutStyleIds}
                    onValueChange={setOpenLayoutStyleIds}
                    className="space-y-2.5"
                  >
                    {localGroups.map((group) => (
                      <AccordionItem
                        key={group.id}
                        value={group.id}
                        className="overflow-hidden rounded-[13px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.52)]"
                      >
                        <AccordionTrigger className="px-3.5 py-2.5 text-left no-underline hover:no-underline">
                          {editingGroupId === group.id ? (
                            <span
                              className="flex flex-1 items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                autoFocus
                                className="h-7 flex-1 rounded-[8px] border border-[rgba(14,165,233,0.5)] bg-[rgba(14,165,233,0.08)] px-2 text-sm font-semibold text-[var(--builder-text-primary)] outline-none"
                                value={editingGroupTitle}
                                onChange={(e) => setEditingGroupTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editingGroupTitle.trim()) {
                                    setLocalGroups((prev) =>
                                      prev.map((g) => g.id === group.id ? { ...g, title: editingGroupTitle.trim() } : g),
                                    );
                                    setEditingGroupId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingGroupId(null);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--builder-brand-primary)] hover:bg-[rgba(14,165,233,0.15)]"
                                onClick={() => {
                                  if (editingGroupTitle.trim()) {
                                    setLocalGroups((prev) =>
                                      prev.map((g) => g.id === group.id ? { ...g, title: editingGroupTitle.trim() } : g),
                                    );
                                  }
                                  setEditingGroupId(null);
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--builder-text-muted)] hover:bg-[var(--builder-bg-surface-highlight)]"
                                onClick={() => setEditingGroupId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ) : (
                            <span className="flex flex-1 items-center gap-2">
                              <span className="text-base font-semibold text-[var(--builder-text-primary)]">
                                {group.title}
                              </span>
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--builder-text-muted)] opacity-0 transition hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)] group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroupId(group.id);
                                  setEditingGroupTitle(group.title);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 border-t border-[var(--builder-border)] px-2.5 pb-2.5 pt-2">
                          {group.variants.map((variant) => {
                            const selected = variant.id === selectedLayoutVariant?.id;
                            return (
                              <button
                                key={variant.id}
                                type="button"
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition',
                                  selected
                                    ? 'border-[rgba(14,165,233,0.8)] bg-[rgba(14,165,233,0.12)] shadow-[0_0_0_1px_rgba(14,165,233,0.55)]'
                                    : 'border-[var(--builder-border)] bg-[rgba(15,23,42,0.5)] hover:bg-[rgba(15,23,42,0.76)]',
                                )}
                                onClick={() => setSelectedLayoutVariantId(variant.id)}
                              >
                                <span
                                  className={cn('inline-block h-2.5 w-2.5 rounded-full', variant.accentColorClassName)}
                                  aria-hidden="true"
                                />
                                <span className="text-sm font-semibold text-[var(--builder-text-primary)]">
                                  {variant.name}
                                </span>
                                {selected ? (
                                  <span className="rounded-full bg-[rgba(16,185,129,0.18)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--builder-success-light)]">
                                    Ativo
                                  </span>
                                ) : null}
                                <span className="ml-auto text-xs font-semibold text-[var(--builder-text-secondary)]">
                                  {formatPageCountLabel(variant.pageCount)}
                                </span>
                              </button>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {selectedLayoutVariant ? (
                    <p className="flex items-center gap-1.5 text-xs text-[var(--builder-text-secondary)]">
                      <LayoutTemplate className="h-3.5 w-3.5 text-[var(--builder-brand-primary)]" />
                      Layout ativo: {selectedLayoutVariant.name} ({selectedLayoutTheme.name})
                    </p>
                  ) : null}
                </>
              )}
            </section>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible={true}
            value={openSectionId}
            onValueChange={(value) => {
              if (value) {
                const nextSectionId = value as BuilderSectionId;
                setOpenSectionId(nextSectionId);
                onSectionChange(nextSectionId);
                return;
              }
              setOpenSectionId(undefined);
            }}
            className="space-y-2.5"
          >
            {BUILDER_SECTIONS.map((section) => {
              const sectionActive = section.id === activeSectionId;
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  data-builder-section-id={section.id}
                  className={cn(
                    'overflow-hidden rounded-[12px] border bg-[rgba(15,23,42,0.58)] px-2.5',
                    sectionActive
                      ? 'border-[rgba(14,165,233,0.35)] shadow-[0_0_20px_rgba(14,165,233,0.12)]'
                      : 'border-[var(--builder-border)]',
                  )}
                >
                  <AccordionTrigger
                    data-builder-section-trigger-id={section.id}
                    className="py-2.5 text-left no-underline hover:no-underline"
                  >
                    <div>
                      <p className="text-[13px] font-bold uppercase tracking-[0.11em] text-[var(--builder-text-muted)]">
                        {section.title}
                      </p>
                      <p className="mt-1 text-xs font-normal text-[var(--builder-text-secondary)]">
                        {section.description}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2.5 pt-1 text-[var(--builder-text-primary)]">
                    {renderSectionEditor(section.id)}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

    </section>
  );
}
