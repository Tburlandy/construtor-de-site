import type { CoverImageLayout, LogoImageLayout } from '@/content/schema';

interface NumericRange {
  min: number;
  max: number;
}

export interface NormalizedCoverImageLayout {
  scale: number;
  x: number;
  y: number;
}

export interface NormalizedLogoImageLayout {
  scale: number;
  x: number;
  y: number;
}

/** Abaixo de 1 reduz o zoom (menos crop); acima de 1 aproxima. */
const COVER_SCALE_RANGE: NumericRange = { min: 0.4, max: 2.5 };
const COVER_X_RANGE: NumericRange = { min: 0, max: 100 };
const COVER_Y_RANGE: NumericRange = { min: 0, max: 100 };

const LOGO_SCALE_RANGE: NumericRange = { min: 0.6, max: 2.5 };
const LOGO_X_RANGE: NumericRange = { min: -120, max: 120 };
const LOGO_Y_RANGE: NumericRange = { min: -80, max: 80 };

const DEFAULT_COVER_LAYOUT: NormalizedCoverImageLayout = {
  scale: 1,
  x: 50,
  y: 50,
};

const DEFAULT_LOGO_LAYOUT: NormalizedLogoImageLayout = {
  scale: 1,
  x: 0,
  y: 0,
};

function clampNumber(value: number, range: NumericRange): number {
  return Math.min(range.max, Math.max(range.min, value));
}

export function normalizeCoverImageLayout(layout?: CoverImageLayout): NormalizedCoverImageLayout {
  return {
    scale: clampNumber(layout?.scale ?? DEFAULT_COVER_LAYOUT.scale, COVER_SCALE_RANGE),
    x: clampNumber(layout?.x ?? DEFAULT_COVER_LAYOUT.x, COVER_X_RANGE),
    y: clampNumber(layout?.y ?? DEFAULT_COVER_LAYOUT.y, COVER_Y_RANGE),
  };
}

export function normalizeLogoImageLayout(layout?: LogoImageLayout): NormalizedLogoImageLayout {
  return {
    scale: clampNumber(layout?.scale ?? DEFAULT_LOGO_LAYOUT.scale, LOGO_SCALE_RANGE),
    x: clampNumber(layout?.x ?? DEFAULT_LOGO_LAYOUT.x, LOGO_X_RANGE),
    y: clampNumber(layout?.y ?? DEFAULT_LOGO_LAYOUT.y, LOGO_Y_RANGE),
  };
}

export function getCoverImageLayoutRanges() {
  return {
    scale: COVER_SCALE_RANGE,
    x: COVER_X_RANGE,
    y: COVER_Y_RANGE,
  };
}

export function getLogoImageLayoutRanges() {
  return {
    scale: LOGO_SCALE_RANGE,
    x: LOGO_X_RANGE,
    y: LOGO_Y_RANGE,
  };
}
