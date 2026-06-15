import type { DealershipRow } from './types';

/** Dealerships with coordinates ready to plot. */
export function mappableDealerships(rows: DealershipRow[]): DealershipRow[] {
  return rows.filter(
    d =>
      d.geocode_status === 'ok' &&
      d.latitude != null &&
      d.longitude != null &&
      Number.isFinite(d.latitude) &&
      Number.isFinite(d.longitude)
  );
}

export function listDealershipBrands(rows: DealershipRow[]): string[] {
  return [...new Set(rows.map(r => r.brand))].sort();
}

export function filterDealerships(
  rows: DealershipRow[],
  options: { brands: string[]; mappableOnly?: boolean }
): DealershipRow[] {
  const brandSet = new Set(options.brands);
  let filtered = rows.filter(d => brandSet.has(d.brand));
  if (options.mappableOnly !== false) {
    filtered = mappableDealerships(filtered);
  }
  return filtered;
}

export function clientDealerships(rows: DealershipRow[]): DealershipRow[] {
  return mappableDealerships(rows).filter(d => d.role === 'client');
}
