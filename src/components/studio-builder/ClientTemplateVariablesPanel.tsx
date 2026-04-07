import {
  builderHintClassName,
  builderInputClassName,
  builderLabelClassName,
} from '@/components/studio-builder/editors/BuilderEditorFields';

export type ClientTemplateVariablesPanelProps = {
  yearsInMarket: string;
  projectCount: string;
  onYearsInMarketChange: (value: string) => void;
  onProjectCountChange: (value: string) => void;
};

/**
 * Campos de variáveis do cliente para interpolação no template Estilo 1 (`template-state` + `global` no save).
 */
export function ClientTemplateVariablesPanel({
  yearsInMarket,
  projectCount,
  onYearsInMarketChange,
  onProjectCountChange,
}: ClientTemplateVariablesPanelProps) {
  return (
    <>
      <div className="my-1 border-t border-[var(--builder-border)]" />

      <div className="space-y-1">
        <p className={builderLabelClassName}>Variáveis do template (Estilo 1)</p>
        <p className={builderHintClassName}>
          Usadas nos placeholders{' '}
          <code className="rounded bg-[rgba(2,6,23,0.5)] px-1 py-px font-mono text-[11px] text-[var(--builder-text-primary)]">
            {'{{yearsInMarket}}'}
          </code>{' '}
          e{' '}
          <code className="rounded bg-[rgba(2,6,23,0.5)] px-1 py-px font-mono text-[11px] text-[var(--builder-text-primary)]">
            {'{{projectCount}}'}
          </code>
          . Entram no estado do cliente quando você salva o construtor (não alteram o template central).
        </p>
      </div>

      <div className="space-y-1.5">
        <p className={builderLabelClassName}>Anos de mercado</p>
        <input
          className={builderInputClassName}
          value={yearsInMarket}
          onChange={(event) => onYearsInMarketChange(event.target.value)}
          placeholder="Ex.: 15"
          inputMode="numeric"
        />
      </div>

      <div className="space-y-1.5">
        <p className={builderLabelClassName}>Número de projetos</p>
        <input
          className={builderInputClassName}
          value={projectCount}
          onChange={(event) => onProjectCountChange(event.target.value)}
          placeholder="Ex.: 1200"
          inputMode="numeric"
        />
      </div>
    </>
  );
}
