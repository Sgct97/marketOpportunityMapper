import type { AudienceZipRow } from '@/lib/audience/aggregate';

export interface ZipSegmentMetric {
  name: string;
  count: number;
}

/** Normalize persisted excluded ZIP codes from project settings. */
export function parseExcludedZips(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const zips = raw
    .map(item => {
      const match = String(item ?? '').match(/\d{5}/);
      return match ? match[0] : null;
    })
    .filter((z): z is string => Boolean(z));
  return [...new Set(zips)].sort();
}

export function isZipExcluded(excludedZips: readonly string[], zip: string): boolean {
  return excludedZips.includes(zip);
}

export function toggleExcludedZip(excludedZips: readonly string[], zip: string): string[] {
  const set = new Set(excludedZips);
  if (set.has(zip)) set.delete(zip);
  else set.add(zip);
  return [...set].sort();
}

/** Drop rows for ZIPs the user has removed from the active trade-area story. */
export function filterRowsByExcludedZips(
  rows: AudienceZipRow[],
  excludedZips: readonly string[]
): AudienceZipRow[] {
  if (excludedZips.length === 0) return rows;
  const excluded = new Set(excludedZips);
  return rows.filter(row => !excluded.has(row.zip));
}

/** Per-segment counts for one ZIP (all segments in the file). */
export function segmentMetricsForZip(
  rows: AudienceZipRow[],
  zip: string
): ZipSegmentMetric[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.zip !== zip || row.audience_count <= 0) continue;
    totals.set(row.audience_type, (totals.get(row.audience_type) ?? 0) + row.audience_count);
  }
  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
