import { describe, expect, it } from 'vitest';
import {
  buildDashboardModel,
  ethnicityComposition,
  intentComposition,
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

describe('ethnicityComposition', () => {
  it('splits Hispanic vs Non-Hispanic when both present', () => {
    const comp = ethnicityComposition(segmentTotals(rows));
    expect(comp.map(c => c.label)).toEqual(['Hispanic', 'Non-Hispanic']);
    expect(comp[0]?.total).toBe(850);
    expect(comp[1]?.total).toBe(700);
  });

  it('returns empty when the split is not present', () => {
    const single = segmentTotals([
      { zip: '1', audience_type: 'EV Shoppers', audience_count: 10 },
    ]);
    expect(ethnicityComposition(single)).toEqual([]);
  });
});

describe('intentComposition', () => {
  it('groups into shoppers / owners / service', () => {
    const comp = intentComposition(segmentTotals(rows));
    const byLabel = Object.fromEntries(comp.map(c => [c.label, c.total]));
    expect(byLabel['In-market shoppers']).toBe(850);
    expect(byLabel['Current owners']).toBe(500);
    expect(byLabel['Service & finance']).toBe(200);
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
