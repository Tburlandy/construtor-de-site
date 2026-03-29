import { useId, useState } from 'react';
import { Loader2, RotateCcw, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCoverImageLayoutRanges, getLogoImageLayoutRanges } from '@/lib/imageLayout';

export const builderInputClassName =
  'builder-focus-ring h-10 w-full rounded-[10px] border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 text-sm text-[var(--builder-text-primary)] placeholder:text-[var(--builder-text-secondary)] transition';

export const builderTextAreaClassName =
  'builder-focus-ring w-full rounded-[10px] border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 py-2.5 text-sm leading-6 text-[var(--builder-text-primary)] placeholder:text-[var(--builder-text-secondary)] transition';

export const builderSelectClassName =
  'builder-focus-ring h-10 w-full rounded-[10px] border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 text-sm text-[var(--builder-text-primary)] transition';

export const builderLabelClassName = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--builder-text-muted)]';

export const builderHintClassName = 'text-xs text-[var(--builder-text-secondary)]';

export const builderPrimaryButtonClassName =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[var(--builder-radius-pill)] bg-[var(--builder-brand-primary)] px-4 text-sm font-semibold text-[#020617] transition hover:bg-[var(--builder-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-50';

export const builderSecondaryButtonClassName =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(7,15,31,0.78)] px-4 text-sm font-semibold text-[var(--builder-text-primary)] transition hover:bg-[var(--builder-bg-surface-highlight)] disabled:cursor-not-allowed disabled:opacity-50';

export interface BuilderImageLayoutValue {
  scale: number;
  x: number;
  y: number;
}

interface BuilderImageLayoutControlsProps {
  mode: 'cover' | 'logo';
  value: BuilderImageLayoutValue;
  onChange: (nextValue: BuilderImageLayoutValue) => void;
  onReset: () => void;
  className?: string;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface BuilderImageRangeControlProps {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (nextValue: number) => void;
}

function BuilderImageRangeControl({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: BuilderImageRangeControlProps) {
  return (
    <label className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-semibold uppercase tracking-[0.14em] text-[var(--builder-text-muted)]">
          {label}
        </span>
        <span className="rounded-full border border-[var(--builder-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--builder-text-primary)]">
          {formatNumber(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isNaN(parsed)) {
            onChange(clamp(parsed, min, max));
          }
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(30,41,59,0.85)] accent-[var(--builder-brand-primary)]"
      />
      <p className="text-[11px] text-[var(--builder-text-secondary)]">{hint}</p>
    </label>
  );
}

export function BuilderImageLayoutControls({
  mode,
  value,
  onChange,
  onReset,
  className,
}: BuilderImageLayoutControlsProps) {
  const ranges = mode === 'logo' ? getLogoImageLayoutRanges() : getCoverImageLayoutRanges();
  const axisHint =
    mode === 'logo'
      ? 'Use para deslocar a imagem no eixo horizontal.'
      : '0% = esquerda, 100% = direita.';
  const verticalHint =
    mode === 'logo' ? 'Use para subir/descer a imagem.' : '0% = topo, 100% = base.';
  const scaleHint =
    mode === 'logo'
      ? 'Controla o tamanho visual da logo.'
      : 'Controla o zoom sem trocar o arquivo original.';

  return (
    <div
      className={cn(
        'space-y-3 rounded-[12px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.52)] p-3',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={builderLabelClassName}>
          {mode === 'logo' ? 'Ajuste da logo' : 'Ajuste de enquadramento'}
        </p>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--builder-border)] px-2.5 text-[11px] font-semibold text-[var(--builder-text-secondary)] transition hover:text-[var(--builder-text-primary)]"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3" />
          Resetar
        </button>
      </div>

      <div className="grid gap-2.5">
        <BuilderImageRangeControl
          label={mode === 'logo' ? 'Tamanho' : 'Zoom'}
          hint={scaleHint}
          min={ranges.scale.min}
          max={ranges.scale.max}
          step={0.01}
          value={value.scale}
          onChange={(nextScale) =>
            onChange({
              ...value,
              scale: nextScale,
            })
          }
        />
        <BuilderImageRangeControl
          label="Posição X"
          hint={axisHint}
          min={ranges.x.min}
          max={ranges.x.max}
          step={1}
          value={value.x}
          onChange={(nextX) =>
            onChange({
              ...value,
              x: nextX,
            })
          }
        />
        <BuilderImageRangeControl
          label="Posição Y"
          hint={verticalHint}
          min={ranges.y.min}
          max={ranges.y.max}
          step={1}
          value={value.y}
          onChange={(nextY) =>
            onChange({
              ...value,
              y: nextY,
            })
          }
        />
      </div>
    </div>
  );
}

interface BuilderImageFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (nextValue: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  disabled?: boolean;
}

export function BuilderImageField({
  label,
  description,
  value,
  onChange,
  onUploadImage,
  disabled = false,
}: BuilderImageFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const url = await onUploadImage(file);
      onChange(url);
    } catch {
      // Erro tratado no nível da página com toast.
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className={builderLabelClassName}>{label}</p>
        {description ? <p className={builderHintClassName}>{description}</p> : null}
      </div>

      <div className="rounded-[14px] border border-dashed border-[var(--builder-border)] bg-[rgba(15,23,42,0.65)] p-3">
        {value ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[10px] border border-[var(--builder-border)] bg-[#020617]">
              <img
                src={value}
                alt={label}
                className="h-36 w-full object-cover"
                onError={(event) => {
                  const target = event.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <input
              className={builderInputClassName}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="/media/projects/..."
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="rounded-[10px] border border-[var(--builder-border)] bg-[rgba(2,6,23,0.8)] px-3 py-5 text-center text-sm text-[var(--builder-text-secondary)]">
            Sem imagem definida.
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={`${builderSecondaryButtonClassName} ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Enviando...' : 'Upload de imagem'}
          </label>
          {value ? (
            <button
              type="button"
              className={builderSecondaryButtonClassName}
              onClick={() => onChange('')}
              disabled={disabled || uploading}
            >
              Limpar
            </button>
          ) : null}
        </div>

        <input
          id={inputId}
          className="hidden"
          type="file"
          accept="image/*"
          disabled={disabled || uploading}
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
}
