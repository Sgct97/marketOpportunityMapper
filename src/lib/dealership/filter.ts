import { distanceMiles } from '@/lib/map/radius';
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

function normalizeDealerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** True when a row is the focus client or the same store saved again as a competitor. */
export function isDuplicateOfClient(
  dealer: DealershipRow,
  client: DealershipRow | null | undefined
): boolean {
  if (!client) return false;
  if (dealer.id === client.id) return true;
  if (
    dealer.latitude == null ||
    dealer.longitude == null ||
    client.latitude == null ||
    client.longitude == null
  ) {
    return false;
  }

  const dist = distanceMiles(
    client.latitude,
    client.longitude,
    dealer.latitude,
    dealer.longitude
  );
  if (dist > 0.5) return false;

  const a = normalizeDealerName(dealer.name);
  const b = normalizeDealerName(client.name);
  return a === b || a.includes(b) || b.includes(a);
}

export function clientDealerships(rows: DealershipRow[]): DealershipRow[] {
  return mappableDealerships(rows).filter(d => d.role === 'client');
}

export function competitorDealerships(
  rows: DealershipRow[],
  client?: DealershipRow | null
): DealershipRow[] {
  const focusClient = client ?? clientDealerships(rows)[0] ?? null;
  return mappableDealerships(rows).filter(
    d => d.role === 'competitor' && !isDuplicateOfClient(d, focusClient)
  );
}
