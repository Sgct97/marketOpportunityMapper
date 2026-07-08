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

/**
 * A composition "facet" — one auto-discovered way the audience splits (e.g.
 * Hispanic vs Non-Hispanic, or Owners vs Intenders). Buckets are mutually
 * exclusive within a facet.
 */
export interface CompositionFacet {
  id: string;
  buckets: CompositionBucket[];
  /** Share of total audience held by named (non-Other) buckets, 0–1. */
  coverage: number;
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
  /** Share of in-radius audience held by the top 5 ZIPs, 0–1. */
  top5Share: number;
  /** Number of in-radius ZIPs that together hold the first 50% of audience. */
  zipsForHalf: number;
  /** Largest single segment within the trade area (a real, non-overlapping count). */
  leadSegment: SegmentTotal | null;
  /** Per-segment totals scoped to ZIPs inside the radius. */
  segments: SegmentTotal[];
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
  composition: CompositionFacet[];
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
 * Adaptive audience composition.
 *
 * Instead of hardcoding categories (ethnicity, intent, …), we read the segment
 * names of whatever file is loaded and auto-discover the natural groupings
 * present in it: recurring words that split the segments into a few mutually
 * exclusive buckets (e.g. "Hispanic / Non-Hispanic", or "EV / Luxury / Service").
 * Everything is derived from the data — nothing is assumed — and the UI labels
 * these as "grouped from segment names" so it's clear they're derived.
 */

// Structural / filler words that never make meaningful groupings.
const FACET_STOPWORDS = new Set([
  'all', 'other', 'others', 'new', 'the', 'and', 'or', 'of', 'a', 'an', 'to', 'for',
  'with', 'in', 'on', 'by', 'auto', 'autos', 'vehicle', 'vehicles', 'car', 'cars',
  'no', 'years', 'year', 'old', 'yr', 'yrs', 'mo', 'month', 'months', 'propensity',
  'reduction', 'payment',
]);

/** Tokenize a segment name into meaningful, de-duplicated words. */
export function facetTokens(name: string): string[] {
  const lower = name.toLowerCase();
  // Keep "non-x" as a single token so "Non-Hispanic" never counts as "Hispanic".
  const collapsed = lower.replace(/non[-\s]*([a-z]+)/g, 'non-$1');
  const tokens = new Set<string>();
  for (let part of collapsed.split(/[^a-z-]+/)) {
    part = part.replace(/^-+|-+$/g, '');
    if (part.length < 2 || FACET_STOPWORDS.has(part)) continue;
    tokens.add(part);
  }
  return [...tokens];
}

function prettyToken(token: string): string {
  return token
    .split('-')
    .map(p => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join('-');
}

interface FacetToken {
  label: string;
  segs: Set<number>;
  total: number;
}

function isDisjoint(a: Set<number>, b: Set<number>): boolean {
  for (const x of a) if (b.has(x)) return false;
  return true;
}

/**
 * Tokens that mark the exact same set of segments describe one thing (e.g.
 * "HYUNDAI/KIA" → hyundai + kia), so merge them into a single labeled bucket.
 */
function mergeIdenticalTokens(candidates: FacetToken[]): FacetToken[] {
  const byKey = new Map<string, { labels: string[]; segs: Set<number>; total: number }>();
  for (const c of candidates) {
    const key = [...c.segs].sort((a, b) => a - b).join(',');
    const entry = byKey.get(key);
    if (entry) entry.labels.push(c.label);
    else byKey.set(key, { labels: [c.label], segs: c.segs, total: c.total });
  }
  return [...byKey.values()].map(e => ({
    label: e.labels.sort().join('/'),
    segs: e.segs,
    total: e.total,
  }));
}

/**
 * Discover composition facets from segment names. A facet is a set of mutually
 * exclusive token-buckets that together cover most of the audience.
 */
export function discoverCompositionFacets(
  segments: SegmentTotal[],
  options: { maxFacets?: number } = {}
): CompositionFacet[] {
  const maxFacets = options.maxFacets ?? 3;
  const n = segments.length;
  if (n < 2) return [];

  const grand = segments.reduce((s, seg) => s + seg.total, 0);
  if (grand <= 0) return [];

  const tokenSegs = new Map<string, Set<number>>();
  segments.forEach((seg, i) => {
    for (const t of facetTokens(seg.name)) {
      const set = tokenSegs.get(t) ?? new Set<number>();
      set.add(i);
      tokenSegs.set(t, set);
    }
  });

  // Candidate markers: present in ≥2 segments but not all (so they discriminate).
  const candidates: FacetToken[] = [];
  for (const [token, segs] of tokenSegs) {
    if (segs.size < 2 || segs.size >= n) continue;
    let total = 0;
    for (const i of segs) total += segments[i]!.total;
    candidates.push({ label: prettyToken(token), segs, total });
  }
  if (candidates.length === 0) return [];

  const markers = mergeIdenticalTokens(candidates).sort(
    (a, b) => b.total - a.total || a.label.localeCompare(b.label)
  );

  const used = new Set<string>();
  const facets: CompositionFacet[] = [];

  for (const seed of markers) {
    if (used.has(seed.label)) continue;

    // Greedily gather markers whose segments don't overlap → mutually exclusive.
    const familySegs = new Set(seed.segs);
    const members: FacetToken[] = [seed];
    for (const cand of markers) {
      if (cand.label === seed.label || used.has(cand.label)) continue;
      if (isDisjoint(cand.segs, familySegs)) {
        members.push(cand);
        for (const i of cand.segs) familySegs.add(i);
      }
    }
    if (members.length < 2) continue;

    let buckets: CompositionBucket[] = members
      .map(m => ({ label: m.label, total: m.total, share: share(m.total, grand) }))
      .filter(b => b.share >= 0.02)
      .sort((a, b) => b.total - a.total);
    if (buckets.length < 2) continue;
    if (buckets.length > 6) buckets = buckets.slice(0, 6);

    const covered = buckets.reduce((s, b) => s + b.total, 0);
    const coverage = share(covered, grand);
    if (coverage < 0.6) continue;

    const remainder = grand - covered;
    if (share(remainder, grand) >= 0.03) {
      buckets.push({ label: 'Other', total: remainder, share: share(remainder, grand) });
    }

    members.forEach(m => used.add(m.label));
    facets.push({ id: members.map(m => m.label).join('|'), buckets, coverage });
    if (facets.length >= maxFacets) break;
  }

  return facets.sort((a, b) => b.coverage - a.coverage);
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

    // Largest single segment within the radius — a real headcount that doesn't
    // double-count people across segments, so it's safe to headline.
    const inRadiusZips = new Set(Object.keys(inRadius));
    const tradeAreaRows = rows.filter(row => inRadiusZips.has(row.zip));
    const tradeAreaSegments = segmentTotals(tradeAreaRows);
    const segInRadius = new Map<string, { total: number; zips: Set<string> }>();
    for (const row of rows) {
      if (!inRadiusZips.has(row.zip)) continue;
      const entry = segInRadius.get(row.audience_type) ?? { total: 0, zips: new Set<string>() };
      entry.total += row.audience_count;
      if (row.audience_count > 0) entry.zips.add(row.zip);
      segInRadius.set(row.audience_type, entry);
    }
    let leadSegment: SegmentTotal | null = null;
    for (const [name, entry] of segInRadius) {
      if (!leadSegment || entry.total > leadSegment.total) {
        leadSegment = {
          name,
          total: entry.total,
          zips: entry.zips.size,
          share: share(entry.total, audienceInRadius),
        };
      }
    }

    const tradeConcentration = concentration(inRadius, audienceInRadius);
    tradeArea = {
      radiusMiles,
      audienceInRadius,
      zipsInRadius,
      share: share(audienceInRadius, totalAudience),
      centroidsResolved: centroidsResolved > 0,
      topZips: tradeConcentration.topZips,
      top5Share: tradeConcentration.top5Share,
      zipsForHalf: tradeConcentration.zipsForHalf,
      leadSegment,
      segments: tradeAreaSegments,
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
    composition: discoverCompositionFacets(segments),
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
