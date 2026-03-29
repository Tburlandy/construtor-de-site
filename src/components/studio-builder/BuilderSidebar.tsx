import { Link } from 'react-router-dom';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Cog,
  FileClock,
  Image,
  Rocket,
  Search,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuilderSection, BuilderSectionId } from './builderSections';

interface BuilderSidebarProps {
  sections: BuilderSection[];
  activeSectionId: BuilderSectionId;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSectionChange: (sectionId: BuilderSectionId) => void;
}

const modules = [
  { id: 'builder', label: 'Construtor', icon: Boxes },
  { id: 'projects', label: 'Projetos', icon: Settings2, href: '/dev/studio/projects' },
  { id: 'media', label: 'Mídia', icon: Image },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'publish', label: 'Publicação', icon: Rocket },
  { id: 'history', label: 'Histórico', icon: FileClock },
  { id: 'settings', label: 'Configurações', icon: Cog },
] as const;

export function BuilderSidebar({
  sections,
  activeSectionId,
  collapsed,
  onToggleCollapsed,
  onSectionChange,
}: BuilderSidebarProps) {
  const groupedSections = [
    {
      group: 'Obrigatórios',
      items: sections.filter((section) => section.group === 'Obrigatórios'),
    },
    {
      group: 'Conteúdo',
      items: sections.filter((section) => section.group === 'Conteúdo'),
    },
    {
      group: 'Complementos',
      items: sections.filter((section) => section.group === 'Complementos'),
    },
  ];

  return (
    <aside
      className={cn(
        'builder-surface builder-scroll overflow-hidden transition-all duration-200',
        collapsed ? 'w-full lg:w-[76px]' : 'w-full lg:w-[260px]',
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--builder-border)] bg-gradient-to-r from-[#020617] to-[#0f172a] px-3 py-3">
        <div className={cn('space-y-0.5', collapsed && 'lg:hidden')}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--builder-accent-warm)]">
            Construtor
          </p>
          <p className="builder-heading text-base font-semibold text-[var(--builder-text-primary)]">
            Navegação
          </p>
        </div>
        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--builder-border)] bg-[rgba(15,23,42,0.75)] text-[var(--builder-text-muted)] transition hover:text-[var(--builder-text-primary)] lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-5 p-3">
        <nav className="space-y-1">
          {modules.map((module) => {
            const Icon = module.icon;
            const baseClassName = cn(
              'group flex w-full items-center rounded-xl border px-2.5 py-2 text-sm transition',
              module.id === 'builder'
                ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.16)] text-[var(--builder-brand-primary)] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                : 'border-transparent text-[var(--builder-text-secondary)] hover:border-[var(--builder-border)] hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]',
            );

            if (module.href) {
              return (
                <Link key={module.id} to={module.href} className={baseClassName}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn('ml-2.5 truncate', collapsed && 'lg:hidden')}>{module.label}</span>
                </Link>
              );
            }

            return (
              <button key={module.id} type="button" className={baseClassName}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn('ml-2.5 truncate', collapsed && 'lg:hidden')}>{module.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={cn('space-y-4', collapsed && 'lg:hidden')}>
          {groupedSections.map((entry) => (
            <div key={entry.group} className="space-y-1.5">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--builder-text-muted)]">
                {entry.group}
              </p>
              <div className="space-y-1">
                {entry.items.map((section) => {
                  const active = section.id === activeSectionId;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSectionChange(section.id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2 text-left transition',
                        active
                          ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.15)] text-[var(--builder-brand-primary)] shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                          : 'border-transparent bg-[rgba(15,23,42,0.25)] text-[var(--builder-text-muted)] hover:border-[var(--builder-border)] hover:bg-[var(--builder-bg-surface-highlight)] hover:text-[var(--builder-text-primary)]',
                      )}
                    >
                      <p className="text-sm font-semibold">{section.title}</p>
                      <p className="mt-1 text-xs text-[var(--builder-text-secondary)]">{section.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {collapsed ? (
        <div className="hidden h-full items-center justify-center px-2 pb-3 text-xs text-[var(--builder-text-secondary)] lg:flex lg:flex-col lg:gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              title={section.title}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                'h-9 w-9 rounded-xl border text-[11px] font-semibold uppercase transition',
                section.id === activeSectionId
                  ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.15)] text-[var(--builder-brand-primary)]'
                  : 'border-transparent bg-[rgba(15,23,42,0.5)] hover:border-[var(--builder-border)] hover:text-[var(--builder-text-primary)]',
              )}
            >
              {section.title.slice(0, 1)}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
