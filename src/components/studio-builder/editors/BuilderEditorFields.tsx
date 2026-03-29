import { useId, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

export const builderInputClassName =
  'builder-focus-ring h-11 w-full rounded-xl border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 text-[15px] text-[var(--builder-text-primary)] placeholder:text-[var(--builder-text-secondary)] transition';

export const builderTextAreaClassName =
  'builder-focus-ring w-full rounded-xl border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 py-2.5 text-[15px] leading-6 text-[var(--builder-text-primary)] placeholder:text-[var(--builder-text-secondary)] transition';

export const builderSelectClassName =
  'builder-focus-ring h-11 w-full rounded-xl border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 text-[15px] text-[var(--builder-text-primary)] transition';

export const builderLabelClassName = 'text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--builder-text-muted)]';

export const builderHintClassName = 'text-xs text-[var(--builder-text-secondary)]';

export const builderPrimaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-[var(--builder-radius-pill)] bg-[var(--builder-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[#020617] transition hover:bg-[var(--builder-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-50';

export const builderSecondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-[var(--builder-radius-pill)] border border-[var(--builder-border)] bg-[rgba(15,23,42,0.75)] px-4 py-2.5 text-sm font-semibold text-[var(--builder-text-primary)] transition hover:bg-[var(--builder-bg-surface-highlight)] disabled:cursor-not-allowed disabled:opacity-50';

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
            <div className="overflow-hidden rounded-xl border border-[var(--builder-border)] bg-[#020617]">
              <img
                src={value}
                alt={label}
                className="h-40 w-full object-cover"
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
          <div className="rounded-xl border border-[var(--builder-border)] bg-[rgba(2,6,23,0.8)] px-3 py-6 text-center text-sm text-[var(--builder-text-secondary)]">
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
