/** Presentation-friendly number formatting helpers. */

export const EMPTY_VALUE = 'n/a';

const FULL = new Intl.NumberFormat('en-US');

/** Full grouped integer, e.g. 1,234,567. */
export function formatNumber(value: number): string {
  return FULL.format(Math.round(value));
}

/** Compact form for big KPI headlines, e.g. 1.2M, 84.3K. */
export function formatCompact(value: number): string {
  const n = Math.round(value);
  if (Math.abs(n) >= 1_000_000) {
    return `${trim(n / 1_000_000)}M`;
  }
  if (Math.abs(n) >= 10_000) {
    return `${trim(n / 1_000)}K`;
  }
  return FULL.format(n);
}

/** Percentage from a 0–1 ratio, e.g. 0.732 → "73%". */
export function formatPercent(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return EMPTY_VALUE;
  return `${(ratio * 100).toFixed(digits)}%`;
}

function trim(value: number): string {
  return value
    .toFixed(1)
    .replace(/\.0$/, '');
}
