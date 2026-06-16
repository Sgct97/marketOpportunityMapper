import type { AudienceZipRow } from '@/lib/audience/aggregate';
import type { DealershipRow } from '@/lib/dealership/types';
import type { LatLng } from '@/lib/map/centroids';
import { distanceMiles } from '@/lib/map/radius';

/**
 * Dashboard analytics.
 *
 * The dashboard tells the opportunity *story* and always works from the full
 * active audience dataset (every segment in the uploaded file), independent of
 * the map's segment toggles. Segment columns vary file to file, so nothing here
 * is hardcoded — we derive everything from whatever `audience_type` values exist.
 */

export interface SegmentTotal {
  name: string;
  total: number;
  zips: number;
  /** Share of total audience, 0–1. */
  share: number;
}

export interface CompositionBucket {
  label: string;
  total: number;
  share: number;
}

export interface TopZip {
  zip: string;
  count: number;
  share: number;
}

export interface TradeAreaStats {
  radiusMiles: number;
  audienceInRadius: number;
  zipsInRadius: number;
  /** In-radius audience as a share of the whole market, 0–1. */
  share: number;
  centroidsResolved: boolean;
  topZips: TopZip[];
}

export interface WhiteSpaceStats {
  zip: string;
  count: number;
}

export interface CompetitiveStats {
  competitorCount: number;
  competitorBrands: string[];
  whiteSpace: WhiteSpaceStats[];
}

export interface ConcentrationStats {
  topZips: TopZip[];
  /** Share of audience held by the top 5 ZIPs, 0–1. */
  top5Share: number;
  /** Share of audience held by the top 10 ZIPs, 0–1. */
  top10Share: number;
  /** Number of ZIPs that together hold the first 50% of audience. */
  zipsForHalf: number;
}

export interface DashboardModel {
  totalAudience: number;
  totalZips: number;
  segmentCount: number;
  segments: SegmentTotal[];
  topSegment: SegmentTotal | null;
  ethnicity: CompositionBucket[];
  intent: CompositionBucket[];
  concentration: ConcentrationStats;
  tradeArea: TradeAreaStats | null;
  competitive: CompetitiveStats;
}

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/** Per-segment totals across every ZIP, richest first. */
export function segmentTotals(rows: AudienceZipRow[]): SegmentTotal[] {
  const totals = new Map<string, { total: number; zips: Set<string> }>();
  let grand = 0;

  for (const row of rows) {
    const entry = totals.get(row.audience_type) ?? { total: 0, zips: new Set() };
    entry.total += row.audience_count;
    if (row.audience_count > 0) entry.zips.add(row.zip);
    totals.set(row.audience_type, entry);
    grand += row.audience_count;
  }

  return Array.from(totals.entries())
    .map(([name, { total, zips }]) => ({
      name,
      total,
      zips: zips.size,
      share: share(total, grand),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** Total audience summed across all segments, keyed by ZIP. */
export function totalsByZip(rows: AudienceZipRow[]): Record<string, number> {
  const byZip: Record<string, number> = {};
  for (const row of rows) {
    byZip[row.zip] = (byZip[row.zip] ?? 0) + row.audience_count;
  }
  return byZip;
}

function rankZips(byZip: Record<string, number>, total: number, limit: number): TopZip[] {
  return Object.entries(byZip)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([zip, count]) => ({ zip, count, share: share(count, total) }));
}

function concentration(byZip: Record<string, number>, total: number): ConcentrationStats {
  const sorted = Object.values(byZip)
    .filter(c => c > 0)
    .sort((a, b) => b - a);

  const sumFirst = (n: number) => sorted.slice(0, n).reduce((s, c) => s + c, 0);

  let running = 0;
  let zipsForHalf = 0;
  const half = total / 2;
  for (const count of sorted) {
    running += count;
    zipsForHalf += 1;
    if (running >= half) break;
  }

  return {
    topZips: rankZips(byZip, total, 8),
    top5Share: share(sumFirst(5), total),
    top10Share: share(sumFirst(10), total),
    zipsForHalf,
  };
}

/**
 * Audience composition by ethnicity, derived from segment names. Returns an
 * empty array unless both Hispanic and Non-Hispanic segments are present (so we
 * never show a misleading single-bucket chart for files without that split).
 */
export function ethnicityComposition(segments: SegmentTotal[]): CompositionBucket[] {
  const buckets = new Map<string, number>();
  let grand = 0;
  let hasHispanic = false;
  let hasNonHispanic = false;

  for (const seg of segments) {
    const label = classifyEthnicity(seg.name);
    if (label === 'Hispanic') hasHispanic = true;
    if (label === 'Non-Hispanic') hasNonHispanic = true;
    buckets.set(label, (buckets.get(label) ?? 0) + seg.total);
    grand += seg.total;
  }

  if (!hasHispanic || !hasNonHispanic) return [];

  return orderBuckets(buckets, grand, ['Hispanic', 'Non-Hispanic', 'General']);
}

/**
 * Audience composition by intent: in-market shoppers vs. current owners vs.
 * service/finance/other. Returns an empty array unless at least two buckets are
 * present so the card always adds signal.
 */
export function intentComposition(segments: SegmentTotal[]): CompositionBucket[] {
  const buckets = new Map<string, number>();
  let grand = 0;

  for (const seg of segments) {
    const label = classifyIntent(seg.name);
    buckets.set(label, (buckets.get(label) ?? 0) + seg.total);
    grand += seg.total;
  }

  if (buckets.size < 2) return [];

  return orderBuckets(buckets, grand, ['In-market shoppers', 'Current owners', 'Service & finance']);
}

function classifyEthnicity(name: string): string {
  const lower = name.toLowerCase();
  if (/non[-\s]?hispanic/.test(lower)) return 'Non-Hispanic';
  if (/hispanic/.test(lower)) return 'Hispanic';
  return 'General';
}

function classifyIntent(name: string): string {
  const lower = name.toLowerCase();
  // Check service/finance first: a segment like "maintenance shoppers" reads as
  // service even though the word "shoppers" appears.
  if (/service|maintenance|credit|finance|refinance|loan|subprime/.test(lower)) {
    return 'Service & finance';
  }
  if (/intender|shopper|in-?market|mover|pre-?owned/.test(lower)) return 'In-market shoppers';
  if (/owner/.test(lower)) return 'Current owners';
  return 'Other';
}

function orderBuckets(
  buckets: Map<string, number>,
  grand: number,
  preferredOrder: string[]
): CompositionBucket[] {
  return Array.from(buckets.entries())
    .map(([label, total]) => ({ label, total, share: share(total, grand) }))
    .sort((a, b) => {
      const ia = preferredOrder.indexOf(a.label);
      const ib = preferredOrder.indexOf(b.label);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.total - a.total;
    });
}

function mappableCompetitors(dealers: DealershipRow[]): { lat: number; lng: number }[] {
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

function nearestMiles(
  lat: number,
  lng: number,
  points: { lat: number; lng: number }[]
): number | null {
  if (points.length === 0) return null;
  let min = Infinity;
  for (const p of points) {
    const d = distanceMiles(lat, lng, p.lat, p.lng);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : null;
}

interface FocusPoint {
  latitude: number | null;
  longitude: number | null;
}

interface DashboardInput {
  rows: AudienceZipRow[];
  zipCentroids: Record<string, LatLng>;
  focus: FocusPoint | null;
  radiusMiles: number;
  competitors: DealershipRow[];
}

/** Build the full dashboard model from the active dataset and project context. */
export function buildDashboardModel(input: DashboardInput): DashboardModel {
  const { rows, zipCentroids, focus, radiusMiles, competitors } = input;

  const segments = segmentTotals(rows);
  const byZip = totalsByZip(rows);
  const totalAudience = segments.reduce((s, seg) => s + seg.total, 0);
  const totalZips = Object.values(byZip).filter(c => c > 0).length;

  const hasFocus =
    focus != null &&
    focus.latitude != null &&
    focus.longitude != null &&
    Number.isFinite(focus.latitude) &&
    Number.isFinite(focus.longitude);

  let tradeArea: TradeAreaStats | null = null;
  if (hasFocus) {
    const inRadius: Record<string, number> = {};
    let audienceInRadius = 0;
    let zipsInRadius = 0;
    let centroidsResolved = 0;

    for (const [zip, count] of Object.entries(byZip)) {
      if (count <= 0) continue;
      const centroid = zipCentroids[zip];
      if (!centroid) continue;
      centroidsResolved += 1;
      if (distanceMiles(focus!.latitude!, focus!.longitude!, centroid.lat, centroid.lng) <= radiusMiles) {
        inRadius[zip] = count;
        audienceInRadius += count;
        zipsInRadius += 1;
      }
    }

    tradeArea = {
      radiusMiles,
      audienceInRadius,
      zipsInRadius,
      share: share(audienceInRadius, totalAudience),
      centroidsResolved: centroidsResolved > 0,
      topZips: rankZips(inRadius, audienceInRadius, 8),
    };
  }

  const compPoints = mappableCompetitors(competitors);
  const maxZip = Math.max(0, ...Object.values(byZip));
  const minWhiteSpace = Math.max(1, Math.round(maxZip * 0.25));
  const whiteSpace: WhiteSpaceStats[] = [];
  for (const [zip, count] of Object.entries(byZip)) {
    if (count < minWhiteSpace) continue;
    const centroid = zipCentroids[zip];
    if (!centroid) continue;
    if (hasFocus) {
      const distToFocus = distanceMiles(focus!.latitude!, focus!.longitude!, centroid.lat, centroid.lng);
      if (distToFocus > radiusMiles) continue;
    }
    const nearest = nearestMiles(centroid.lat, centroid.lng, compPoints);
    if (nearest != null && nearest <= radiusMiles) continue;
    whiteSpace.push({ zip, count });
  }
  whiteSpace.sort((a, b) => b.count - a.count);

  return {
    totalAudience,
    totalZips,
    segmentCount: segments.length,
    segments,
    topSegment: segments[0] ?? null,
    ethnicity: ethnicityComposition(segments),
    intent: intentComposition(segments),
    concentration: concentration(byZip, totalAudience),
    tradeArea,
    competitive: {
      competitorCount: compPoints.length,
      competitorBrands: competitorBrandList(competitors),
      whiteSpace: whiteSpace.slice(0, 8),
    },
  };
}

function competitorBrandList(competitors: DealershipRow[]): string[] {
  return Array.from(
    new Set(
      competitors
        .filter(d => d.role === 'competitor')
        .map(d => d.brand?.trim())
        .filter((b): b is string => Boolean(b))
    )
  ).sort();
}
