import { cn } from '@/lib/utils';

export type BuilderOverrideBadgeProps = {
  variant: 'inherited' | 'overridden';
  className?: string;
};

export function BuilderOverrideBadge({ variant, className }: BuilderOverrideBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        variant === 'inherited' &&
          'border border-slate-500/40 bg-slate-500/15 text-slate-200',
        variant === 'overridden' &&
          'border border-sky-400/45 bg-sky-500/15 text-sky-100',
        className,
      )}
    >
      {variant === 'inherited' ? 'Herdado' : 'Personalizado'}
    </span>
  );
}
