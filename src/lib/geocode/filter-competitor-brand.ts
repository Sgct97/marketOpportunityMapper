import { canonicalizeOemBrand } from '@/lib/brands';
import { detectBrand } from '@/lib/dealership/infer-client';

/**
 * Keep Places hits that belong to the searched OEM.
 *
 * Google text search + location bias often returns neighboring dealers on the
 * same auto row (e.g. "I-10 Toyota" when searching Hyundai). If the place name
 * clearly names a different OEM, drop it. Names with no detectable OEM are kept
 * so odd legal names are not silently discarded.
 */
export function competitorMatchesSearchBrand(
  placeName: string,
  searchBrand: string
): boolean {
  const searchCanon = canonicalizeOemBrand(searchBrand) ?? searchBrand.trim();
  if (!searchCanon) return false;

  const detected = detectBrand(placeName);
  if (!detected) return true;

  const detectedCanon = canonicalizeOemBrand(detected) ?? detected;
  return detectedCanon.toLowerCase() === searchCanon.toLowerCase();
}

export function filterPlacesMatchingSearchBrand<T extends { name: string }>(
  places: T[],
  searchBrand: string
): T[] {
  return places.filter(p => competitorMatchesSearchBrand(p.name, searchBrand));
}

/** Brand to persist for a selected competitor, or null if it should be rejected. */
export function resolveCompetitorSaveBrand(
  placeName: string,
  searchBrand: string
): string | null {
  const searchCanon = canonicalizeOemBrand(searchBrand) ?? searchBrand.trim();
  if (!searchCanon) return null;
  if (!competitorMatchesSearchBrand(placeName, searchBrand)) return null;

  const detected = detectBrand(placeName);
  if (!detected) return searchCanon;
  return canonicalizeOemBrand(detected) ?? detected;
}
