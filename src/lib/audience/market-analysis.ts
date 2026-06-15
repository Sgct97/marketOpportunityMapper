import type { DealershipRow } from '@/lib/dealership/types';
import type { LatLng } from '@/lib/map/centroids';
import { distanceMiles } from '@/lib/map/radius';

export interface ZipAudienceRank {
  zip: string;
  count: number;
}

export interface WhiteSpaceZip {
  zip: string;
  count: number;
}

export interface MarketAnalysis {
  audienceInRadius: number;
  zipsInRadius: number;
  topZips: ZipAudienceRank[];
  whiteSpace: WhiteSpaceZip[];
  centroidsResolved: number;
}

interface CompetitorPoint {
  lat: number;
  lng: number;
}

function mappableCompetitors(dealers: DealershipRow[]): CompetitorPoint[] {
  return dealers
    .filter(
      d =>
        d.role === 'competitor' &&
        d.latitude != null &&
        d.longitude != null &&
        Number.isFinite(d.latitude) &&
        Number.isFinite(d.longitude)
    )
    .map(d => ({ lat: d.latitude!, lng: d.longitude! }));
}

function nearestCompetitorMiles(
  lat: number,
  lng: number,
  competitors: CompetitorPoint[]
): number | null {
  if (competitors.length === 0) return null;
  let min = Infinity;
  for (const c of competitors) {
    const d = distanceMiles(lat, lng, c.lat, c.lng);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : null;
}

export function topZipsByAudience(
  byZip: Record<string, number>,
  limit = 5
): ZipAudienceRank[] {
  return Object.entries(byZip)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([zip, count]) => ({ zip, count }));
}

export function audienceInRadius(options: {
  byZip: Record<string, number>;
  zipCentroids: Record<string, LatLng>;
  focusLat: number;
  focusLng: number;
  radiusMiles: number;
}): { total: number; zipCount: number; centroidsResolved: number } {
  const { byZip, zipCentroids, focusLat, focusLng, radiusMiles } = options;
  let total = 0;
  let zipCount = 0;
  let centroidsResolved = 0;

  for (const [zip, count] of Object.entries(byZip)) {
    if (count <= 0) continue;
    const centroid = zipCentroids[zip];
    if (!centroid) continue;
    centroidsResolved += 1;
    if (distanceMiles(focusLat, focusLng, centroid.lat, centroid.lng) <= radiusMiles) {
      total += count;
      zipCount += 1;
    }
  }

  return { total, zipCount, centroidsResolved };
}

export function whiteSpaceZips(options: {
  byZip: Record<string, number>;
  zipCentroids: Record<string, LatLng>;
  competitors: DealershipRow[];
  competitorWithinMiles: number;
  minCountRatio?: number;
  limit?: number;
}): WhiteSpaceZip[] {
  const {
    byZip,
    zipCentroids,
    competitors,
    competitorWithinMiles,
    minCountRatio = 0.25,
    limit = 8,
  } = options;

  const compPoints = mappableCompetitors(competitors);
  const maxCount = Math.max(0, ...Object.values(byZip));
  if (maxCount <= 0) return [];

  const minCount = Math.max(1, Math.round(maxCount * minCountRatio));
  const results: WhiteSpaceZip[] = [];

  for (const [zip, count] of Object.entries(byZip)) {
    if (count < minCount) continue;
    const centroid = zipCentroids[zip];
    if (!centroid) continue;

    const nearest = nearestCompetitorMiles(centroid.lat, centroid.lng, compPoints);
    if (nearest != null && nearest <= competitorWithinMiles) continue;

    results.push({ zip, count });
  }

  return results.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function computeMarketAnalysis(options: {
  byZip: Record<string, number>;
  zipCentroids: Record<string, LatLng>;
  focusLat: number;
  focusLng: number;
  radiusMiles: number;
  competitors: DealershipRow[];
  whiteSpaceMiles?: number;
  topZipLimit?: number;
}): MarketAnalysis {
  const radius = audienceInRadius({
    byZip: options.byZip,
    zipCentroids: options.zipCentroids,
    focusLat: options.focusLat,
    focusLng: options.focusLng,
    radiusMiles: options.radiusMiles,
  });

  return {
    audienceInRadius: radius.total,
    zipsInRadius: radius.zipCount,
    centroidsResolved: radius.centroidsResolved,
    topZips: topZipsByAudience(options.byZip, options.topZipLimit ?? 5),
    whiteSpace: whiteSpaceZips({
      byZip: options.byZip,
      zipCentroids: options.zipCentroids,
      competitors: options.competitors,
      competitorWithinMiles: options.whiteSpaceMiles ?? options.radiusMiles,
    }),
  };
}
