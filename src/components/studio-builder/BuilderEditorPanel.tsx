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

    const timer = setTimeout(() => {
      const target = node.querySelector<HTMLElement>(`[data-builder-section-id="${activeSectionId}"]`);
      if (!target) {
        node.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const containerRect = node.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = Math.max(0, node.scrollTop + targetRect.top - containerRect.top - 8);
      node.scrollTo({ top: targetTop, behavior: 'smooth' });
    }, 0);

    return () => clearTimeout(timer);
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
            <p className={builderLabelClassName}>CTA</p>
            <input
              className={builderInputClassName}
              value={content.hero.ctaLabel}
              onChange={(event) => setHeroField('ctaLabel', event.target.value)}
            />
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
                  <AccordionTrigger className="py-2.5 text-left no-underline hover:no-underline">
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
