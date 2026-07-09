import zipcodes from 'zipcodes';

/** USPS primary city + state for a five-digit ZIP (from the zipcodes dataset). */
export interface ZipLabel {
  zip: string;
  city: string;
  state: string;
}

export function normalizeZipCode(raw: string): string | null {
  const match = String(raw ?? '').match(/\d{5}/);
  return match ? match[0] : null;
}

/** Look up the USPS primary city for one ZIP code. */
export function lookupUspsZipLabel(zip: string): ZipLabel | null {
  const normalized = normalizeZipCode(zip);
  if (!normalized) return null;

  const record = zipcodes.lookup(normalized);
  if (!record?.city?.trim() || !record?.state?.trim()) return null;

  return {
    zip: normalized,
    city: record.city.trim(),
    state: record.state.trim(),
  };
}

/** Build a ZIP → USPS label map for every ZIP in the project file. */
export function buildZipLabelMap(zips: Iterable<string>): Record<string, ZipLabel> {
  const map: Record<string, ZipLabel> = {};
  for (const raw of zips) {
    const label = lookupUspsZipLabel(raw);
    if (label) map[label.zip] = label;
  }
  return map;
}

export function formatZipDisplay(
  zip: string,
  labels?: Record<string, ZipLabel>,
  options?: { includeState?: boolean }
): string {
  const normalized = normalizeZipCode(zip) ?? zip;
  const label = labels?.[normalized];
  if (!label) return normalized;
  if (options?.includeState) return `${normalized} · ${label.city}, ${label.state}`;
  return `${normalized} · ${label.city}`;
}

/** Accessible hover text with the full USPS city + state. */
export function formatZipDisplayTitle(
  zip: string,
  labels?: Record<string, ZipLabel>
): string {
  const normalized = normalizeZipCode(zip) ?? zip;
  const label = labels?.[normalized];
  if (!label) return normalized;
  return `${normalized} · ${label.city}, ${label.state}`;
}
