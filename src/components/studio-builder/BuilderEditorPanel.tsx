import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Benefit, Content, Project } from '@/content/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { BUILDER_SECTIONS, type BuilderSectionId, type BuilderTabId } from './builderSections';
import {
  BuilderImageField,
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
  activeTab: BuilderTabId;
  onTabChange: (nextTab: BuilderTabId) => void;
  onSectionChange: (sectionId: BuilderSectionId) => void;
  onContentChange: (updater: (current: Content) => Content) => void;
  onUploadImage: (file: File) => Promise<string>;
  onRequestPreviewRefresh: () => void;
}

function clampToPositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function BuilderEditorPanel({
  content,
  activeSectionId,
  activeTab,
  onTabChange,
  onSectionChange,
  onContentChange,
  onUploadImage,
  onRequestPreviewRefresh,
}: BuilderEditorPanelProps) {
  const [jsonLdDraft, setJsonLdDraft] = useState(() => JSON.stringify(content.seo.jsonLd ?? {}, null, 2));
  const [jsonLdError, setJsonLdError] = useState<string | null>(null);
  const [highlightPreviewOnSelect, setHighlightPreviewOnSelect] = useState(true);
  const [autoRefreshPreview, setAutoRefreshPreview] = useState(true);

  useEffect(() => {
    setJsonLdDraft(JSON.stringify(content.seo.jsonLd ?? {}, null, 2));
  }, [content.seo.jsonLd]);

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
    <section className="builder-surface flex h-full min-h-[420px] flex-col overflow-hidden">
      <header className="border-b border-[var(--builder-border)] bg-gradient-to-r from-[rgba(2,6,23,0.95)] to-[rgba(15,23,42,0.92)] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
          Editor
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="builder-heading text-[26px] font-bold leading-[1.1] text-[var(--builder-text-primary)]">
            Editor de Proposta
          </h2>
          <div className="inline-flex rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.75)] p-1">
            <button
              type="button"
              className={cn(
                'rounded-[var(--builder-radius-pill)] px-4 py-2 text-sm font-semibold transition',
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
                'rounded-[var(--builder-radius-pill)] px-4 py-2 text-sm font-semibold transition',
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

      <div className="builder-scroll flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'layout' ? (
          <div className="space-y-3 rounded-[14px] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.5)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--builder-text-muted)]">
              Configurações visuais do builder
            </h3>
            <p className="text-sm text-[var(--builder-text-secondary)]">
              Modo Layout está preparado para evolução incremental. Os toggles abaixo afetam apenas a experiência do construtor.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-[var(--builder-text-primary)]">Highlight de seção no preview</p>
                  <p className="text-xs text-[var(--builder-text-secondary)]">Mantém contexto entre sidebar e página.</p>
                </div>
                <Switch
                  checked={highlightPreviewOnSelect}
                  onCheckedChange={setHighlightPreviewOnSelect}
                  className="data-[state=checked]:bg-[var(--builder-brand-primary)] data-[state=unchecked]:bg-[rgba(30,41,59,0.9)]"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--builder-border)] bg-[rgba(2,6,23,0.55)] px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-[var(--builder-text-primary)]">Refresh automático pós-save</p>
                  <p className="text-xs text-[var(--builder-text-secondary)]">Atualiza o iframe após salvar alterações.</p>
                </div>
                <Switch
                  checked={autoRefreshPreview}
                  onCheckedChange={setAutoRefreshPreview}
                  className="data-[state=checked]:bg-[var(--builder-brand-primary)] data-[state=unchecked]:bg-[rgba(30,41,59,0.9)]"
                />
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(139,92,246,0.35)] bg-[rgba(76,29,149,0.22)] px-3 py-2 text-xs text-[#E9D5FF]">
              Ações avançadas de layout (grids, presets e estados visuais) serão conectadas em cards posteriores.
            </div>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible={false}
            value={activeSectionId}
            onValueChange={(value) => {
              if (value) {
                onSectionChange(value as BuilderSectionId);
              }
            }}
            className="space-y-3"
          >
            {BUILDER_SECTIONS.map((section) => {
              const sectionActive = section.id === activeSectionId;
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className={cn(
                    'overflow-hidden rounded-[14px] border bg-[rgba(15,23,42,0.6)] px-3',
                    sectionActive
                      ? 'border-[rgba(14,165,233,0.35)] shadow-[0_0_20px_rgba(14,165,233,0.12)]'
                      : 'border-[var(--builder-border)]',
                  )}
                >
                  <AccordionTrigger className="py-3 text-left no-underline hover:no-underline">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--builder-text-muted)]">
                        {section.title}
                      </p>
                      <p className="mt-1 text-xs font-normal text-[var(--builder-text-secondary)]">
                        {section.description}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 pt-1 text-[var(--builder-text-primary)]">
                    {renderSectionEditor(section.id)}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <footer className="border-t border-[var(--builder-border)] bg-[rgba(2,6,23,0.75)] px-4 py-3">
        <button
          type="button"
          className={builderPrimaryButtonClassName}
          onClick={onRequestPreviewRefresh}
        >
          Atualizar preview
        </button>
      </footer>
    </section>
  );
}
