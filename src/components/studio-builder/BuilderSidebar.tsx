import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Boxes,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileClock,
  Image,
  Rocket,
  Search,
  Settings2,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuilderSection, BuilderSectionId } from './builderSections';

export type BuilderSidebarModuleId =
  | 'builder'
  | 'history'
  | 'publish';

interface BuilderSidebarProps {
  sections: BuilderSection[];
  activeSectionId: BuilderSectionId;
  activeModuleId: BuilderSidebarModuleId;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSectionChange: (sectionId: BuilderSectionId) => void;
  onModuleChange: (moduleId: BuilderSidebarModuleId) => void;
}

interface BuilderModule {
  id: BuilderSidebarModuleId | 'clients';
  label: string;
  icon: LucideIcon;
  href?: string;
}

const modules: BuilderModule[] = [
  { id: 'builder', label: 'Construtor', icon: Boxes },
  { id: 'history', label: 'Histórico', icon: FileClock },
  { id: 'publish', label: 'Publicação', icon: Rocket },
  { id: 'clients', label: 'Clientes', icon: Settings2, href: '/construtor' },
] as const;

const sectionIcons: Record<BuilderSectionId, LucideIcon> = {
  global: FileCheck,
  seo: Search,
  hero: Zap,
  benefits: Award,
  showcase: Building,
  media: Image,
  cta: CheckCircle2,
  footer: Wrench,
};

export function BuilderSidebar({
  sections,
  activeSectionId,
  activeModuleId,
  collapsed,
  onToggleCollapsed,
  onSectionChange,
  onModuleChange,
}: BuilderSidebarProps) {
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const expanded = !collapsed || hoverExpanded;

  return (
    <aside
      onMouseEnter={() => {
        if (collapsed) {
          setHoverExpanded(true);
        }
      }}
      onMouseLeave={() => {
        if (collapsed) {
          setHoverExpanded(false);
        }
      }}
      className={cn(
        'builder-surface flex min-h-0 flex-col overflow-hidden transition-all duration-200 lg:h-full',
        expanded ? 'w-full lg:w-[226px]' : 'w-full lg:w-[66px]',
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--builder-border)] bg-gradient-to-r from-[#020617] to-[#0a1630] px-2.5 py-2.5">
        <div className={cn('space-y-0.5', !expanded && 'lg:hidden')}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Construtor
          </p>
          <p className="builder-heading text-[15px] font-semibold text-[var(--builder-text-primary)]">
            Navegação
          </p>
        </div>
        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--builder-border)] bg-[rgba(7,15,31,0.72)] text-[var(--builder-text-muted)] transition hover:text-[var(--builder-text-primary)] lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn('builder-scroll min-h-0 overflow-y-auto p-2', expanded ? 'flex-1' : 'flex-none')}>
        <nav className="space-y-1.5">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActiveModule = module.id === activeModuleId;
            const baseClassName = cn(
              'group flex w-full items-center rounded-[10px] border px-2 py-1.5 text-[12px] transition',
              isActiveModule
                ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.16)] text-[var(--builder-brand-primary)] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                : 'border-transparent text-[var(--builder-text-secondary)] hover:border-[var(--builder-border)] hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]',
            );

            if (module.href) {
              return (
                <Link key={module.id} to={module.href} className={baseClassName}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn('ml-2.5 truncate', !expanded && 'lg:hidden')}>{module.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={module.id}
                type="button"
                className={baseClassName}
                onClick={() => {
                  if (module.id !== 'clients') {
                    onModuleChange(module.id);
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn('ml-2.5 truncate', !expanded && 'lg:hidden')}>{module.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={cn('my-3 border-t-2 border-[rgba(99,120,160,0.5)]', !expanded && 'lg:hidden')} />

        <div className={cn('space-y-1', !expanded && 'lg:hidden')}>
          {sections.map((section) => {
            const Icon = sectionIcons[section.id];
            const active = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'group flex w-full items-center rounded-[10px] border px-2 py-1.5 text-[12px] transition',
                  active
                    ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.15)] text-[var(--builder-brand-primary)] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                    : 'border-transparent text-[var(--builder-text-secondary)] hover:border-[var(--builder-border)] hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="ml-2.5 truncate font-semibold">{section.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!expanded ? (
        <div className="hidden border-t-2 border-[rgba(99,120,160,0.5)] mt-3 mb-2 px-2 pt-3 pb-2 text-xs text-[var(--builder-text-secondary)] lg:flex lg:flex-col lg:gap-0">
          {sections.map((section) => {
            const Icon = sectionIcons[section.id];
            return (
              <button
                key={section.id}
                type="button"
                title={section.title}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[10px] border transition',
                  section.id === activeSectionId
                    ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.15)] text-[var(--builder-brand-primary)]'
                    : 'border-transparent bg-[rgba(15,23,42,0.5)] hover:border-[var(--builder-border)] hover:text-[var(--builder-text-primary)]',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
