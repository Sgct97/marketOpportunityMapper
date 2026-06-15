export interface AudienceZipRow {
  zip: string;
  audience_type: string;
  audience_count: number;
}

export interface ZipAggregateResult {
  byZip: Record<string, number>;
  zips: string[];
  totalAudience: number;
  maxCount: number;
}

/** Sum audience counts per ZIP for the selected segment types. */
export function aggregateAudienceByZip(
  rows: AudienceZipRow[],
  selectedTypes: string[]
): ZipAggregateResult {
  const typeSet = new Set(selectedTypes);
  const byZip: Record<string, number> = {};

  for (const row of rows) {
    if (!typeSet.has(row.audience_type)) continue;
    byZip[row.zip] = (byZip[row.zip] ?? 0) + row.audience_count;
  }

  const zips = Object.keys(byZip).sort();
  let totalAudience = 0;
  let maxCount = 0;

  for (const zip of zips) {
    const count = byZip[zip] ?? 0;
    totalAudience += count;
    if (count > maxCount) maxCount = count;
  }

  return { byZip, zips, totalAudience, maxCount };
}

export function listAudienceTypes(rows: AudienceZipRow[]): string[] {
  return [...new Set(rows.map(r => r.audience_type))].sort();
}

/** Quantile stops 0–1 for legend labels. */
export function legendStops(maxCount: number): { label: string; ratio: number }[] {
  if (maxCount <= 0) return [{ label: '0', ratio: 0 }];
  return [0.2, 0.4, 0.6, 0.8, 1].map(ratio => ({
    ratio,
    label: Math.round(maxCount * ratio).toLocaleString(),
  }));
}
