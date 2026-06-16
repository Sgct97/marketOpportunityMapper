import { describe, expect, it } from 'vitest';
import {
  buildDashboardModel,
  discoverCompositionFacets,
  facetTokens,
  segmentTotals,
  totalsByZip,
} from './dashboard';
import type { AudienceZipRow } from './aggregate';
import type { DealershipRow } from '@/lib/dealership/types';

const rows: AudienceZipRow[] = [
  { zip: '92336', audience_type: 'Hispanic HYUNDAI/KIA Intenders', audience_count: 600 },
  { zip: '92336', audience_type: 'Non-Hispanic HYUNDAI/KIA Owners', audience_count: 400 },
  { zip: '92336', audience_type: 'Non-Hispanic Auto service / maintenance shoppers', audience_count: 200 },
  { zip: '91739', audience_type: 'Hispanic HYUNDAI/KIA Intenders', audience_count: 200 },
  { zip: '91739', audience_type: 'Non-Hispanic HYUNDAI/KIA Owners', audience_count: 100 },
  { zip: '90001', audience_type: 'Hispanic HYUNDAI/KIA Intenders', audience_count: 50 },
];

describe('segmentTotals', () => {
  it('totals every segment and ranks by size with shares', () => {
    const segs = segmentTotals(rows);
    expect(segs).toHaveLength(3);
    expect(segs[0]?.name).toBe('Hispanic HYUNDAI/KIA Intenders');
    expect(segs[0]?.total).toBe(850);
    expect(segs[0]?.zips).toBe(3);
    const grand = 850 + 500 + 200;
    expect(segs[0]?.share).toBeCloseTo(850 / grand, 5);
  });

  it('shares sum to 1', () => {
    const segs = segmentTotals(rows);
    const sum = segs.reduce((s, seg) => s + seg.share, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe('totalsByZip', () => {
  it('sums all segments per ZIP', () => {
    const byZip = totalsByZip(rows);
    expect(byZip['92336']).toBe(1200);
    expect(byZip['91739']).toBe(300);
  });
});

describe('facetTokens', () => {
  it('keeps "non-hispanic" distinct from "hispanic"', () => {
    expect(facetTokens('Non- Hispanic HYUNDAI/KIA Owners')).toContain('non-hispanic');
    expect(facetTokens('Non- Hispanic HYUNDAI/KIA Owners')).not.toContain('hispanic');
    expect(facetTokens('Hispanic HYUNDAI/KIA Intenders')).toContain('hispanic');
  });

  it('splits slash-joined brands and drops filler words', () => {
    const tokens = facetTokens('Hispanic all other ASIAN IMPORT owners');
    expect(tokens).toContain('asian');
    expect(tokens).toContain('import');
    expect(tokens).not.toContain('all');
    expect(tokens).not.toContain('other');
  });
});

const fontanaLike = segmentTotals([
  { zip: '1', audience_type: 'Hispanic HYUNDAI/KIA Intenders', audience_count: 600 },
  { zip: '1', audience_type: 'Hispanic HYUNDAI/KIA Owners', audience_count: 300 },
  { zip: '1', audience_type: 'Non-Hispanic HYUNDAI/KIA Intenders', audience_count: 250 },
  { zip: '1', audience_type: 'Non-Hispanic HYUNDAI/KIA Owners', audience_count: 350 },
]);

describe('discoverCompositionFacets', () => {
  it('auto-discovers the Hispanic / Non-Hispanic split from segment names', () => {
    const facets = discoverCompositionFacets(fontanaLike);
    const labels = facets.flatMap(f => f.buckets.map(b => b.label));
    expect(labels).toContain('Hispanic');
    expect(labels).toContain('Non-Hispanic');
    // It should also discover the Owners / Intenders lifecycle split.
    expect(labels).toContain('Owners');
    expect(labels).toContain('Intenders');
  });

  it('adapts to a different file (vehicle interest + ethnicity)', () => {
    const segs = segmentTotals([
      { zip: '1', audience_type: 'Hispanic EV Shoppers', audience_count: 300 },
      { zip: '1', audience_type: 'Non-Hispanic EV Shoppers', audience_count: 200 },
      { zip: '1', audience_type: 'Hispanic Luxury Owners', audience_count: 150 },
      { zip: '1', audience_type: 'Non-Hispanic Luxury Owners', audience_count: 150 },
    ]);
    const facets = discoverCompositionFacets(segs);
    // Should find two clean splits: EV/Shoppers vs Luxury/Owners, and ethnicity.
    expect(facets.length).toBeGreaterThanOrEqual(2);
    const allLabels = facets.flatMap(f => f.buckets.map(b => b.label));
    expect(allLabels).toContain('Hispanic');
    expect(allLabels.some(l => l.includes('Luxury'))).toBe(true);
  });

  it('returns nothing when names share no recurring words', () => {
    const segs = segmentTotals([
      { zip: '1', audience_type: 'EV Shoppers', audience_count: 10 },
      { zip: '1', audience_type: 'Luxury Owners', audience_count: 10 },
    ]);
    expect(discoverCompositionFacets(segs)).toEqual([]);
  });

  it('keeps buckets within a facet mutually exclusive (shares sum ≤ 1)', () => {
    const facets = discoverCompositionFacets(fontanaLike);
    for (const facet of facets) {
      const sum = facet.buckets.reduce((s, b) => s + b.share, 0);
      expect(sum).toBeLessThanOrEqual(1.0001);
    }
  });
});

const centroids = {
  '92336': { lat: 34.1, lng: -117.46 },
  '91739': { lat: 34.13, lng: -117.57 },
  '90001': { lat: 33.97, lng: -118.24 },
};

const competitor: DealershipRow = {
  id: 'c1',
  name: 'Rival',
  brand: 'Nissan',
  role: 'competitor',
  latitude: 33.97,
  longitude: -118.24,
  address: null,
  geocode_status: 'ok',
};

describe('buildDashboardModel', () => {
  it('builds market totals and concentration with no focus', () => {
    const model = buildDashboardModel({
      rows,
      zipCentroids: centroids,
      focus: null,
      radiusMiles: 25,
      competitors: [],
    });

    expect(model.totalAudience).toBe(1550);
    expect(model.totalZips).toBe(3);
    expect(model.segmentCount).toBe(3);
    expect(model.tradeArea).toBeNull();
    expect(model.concentration.topZips[0]?.zip).toBe('92336');
    expect(model.concentration.top5Share).toBeCloseTo(1, 5);
  });

  it('scopes the trade area to the radius around the focus dealer', () => {
    const model = buildDashboardModel({
      rows,
      zipCentroids: centroids,
      focus: { latitude: 34.1, longitude: -117.46 },
      radiusMiles: 25,
      competitors: [competitor],
    });

    expect(model.tradeArea).not.toBeNull();
    // 92336 + 91739 are within 25mi; 90001 (~45mi) is excluded.
    expect(model.tradeArea?.audienceInRadius).toBe(1500);
    expect(model.tradeArea?.zipsInRadius).toBe(2);
    expect(model.tradeArea?.share).toBeCloseTo(1500 / 1550, 5);
    expect(model.tradeArea?.topZips.some(z => z.zip === '90001')).toBe(false);
    // Concentration is computed within the trade area (92336=1200, 91739=300).
    expect(model.tradeArea?.top5Share).toBeCloseTo(1, 5);
    expect(model.tradeArea?.zipsForHalf).toBe(1);
    // Lead segment is the largest single segment among in-radius ZIPs.
    expect(model.tradeArea?.leadSegment?.name).toBe('Hispanic HYUNDAI/KIA Intenders');
    expect(model.tradeArea?.leadSegment?.total).toBe(800);
    expect(model.tradeArea?.leadSegment?.share).toBeCloseTo(800 / 1500, 5);
  });

  it('reports competitors and finds white space away from rivals', () => {
    // Rival sits at 90001 (~45mi from the focus). Within a 25mi ring the high-
    // audience ZIPs are far from the rival, so they should surface as white space.
    const model = buildDashboardModel({
      rows,
      zipCentroids: centroids,
      focus: { latitude: 34.1, longitude: -117.46 },
      radiusMiles: 25,
      competitors: [competitor],
    });

    expect(model.competitive.competitorCount).toBe(1);
    expect(model.competitive.competitorBrands).toEqual(['Nissan']);
    // 90001 is outside the 25mi ring (and on the rival), so never white space.
    expect(model.competitive.whiteSpace.some(z => z.zip === '90001')).toBe(false);
    // High-audience ZIPs far from the rival should surface.
    expect(model.competitive.whiteSpace.some(z => z.zip === '92336')).toBe(true);
  });
});
