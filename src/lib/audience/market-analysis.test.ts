import { describe, expect, it } from 'vitest';
import {
  audienceInRadius,
  computeMarketAnalysis,
  topZipsByAudience,
  whiteSpaceZips,
} from './market-analysis';
import type { DealershipRow } from '@/lib/dealership/types';

const centroids: Record<string, { lat: number; lng: number }> = {
  '90210': { lat: 34.09, lng: -118.41 },
  '91786': { lat: 34.07, lng: -117.65 },
  '90632': { lat: 33.93, lng: -117.95 },
};

const byZip = { '90210': 1000, '91786': 500, '90632': 200 };

const competitor: DealershipRow = {
  id: 'c1',
  name: 'Comp',
  brand: 'Toyota',
  role: 'competitor',
  latitude: 34.09,
  longitude: -118.41,
  address: null,
  geocode_status: 'ok',
};

describe('topZipsByAudience', () => {
  it('returns highest counts first', () => {
    expect(topZipsByAudience(byZip, 2)).toEqual([
      { zip: '90210', count: 1000 },
      { zip: '91786', count: 500 },
    ]);
  });
});

describe('audienceInRadius', () => {
  it('sums ZIPs within radius of focus', () => {
    const result = audienceInRadius({
      byZip,
      zipCentroids: centroids,
      focusLat: 34.09,
      focusLng: -118.41,
      radiusMiles: 5,
    });
    expect(result.total).toBe(1000);
    expect(result.zipCount).toBe(1);
  });
});

describe('whiteSpaceZips', () => {
  it('excludes ZIPs near competitors', () => {
    const result = whiteSpaceZips({
      byZip,
      zipCentroids: centroids,
      competitors: [competitor],
      competitorWithinMiles: 25,
      minCountRatio: 0.1,
    });
    expect(result.some(z => z.zip === '90210')).toBe(false);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns all high-audience ZIPs when no competitors', () => {
    const result = whiteSpaceZips({
      byZip,
      zipCentroids: centroids,
      competitors: [],
      competitorWithinMiles: 25,
      minCountRatio: 0.1,
    });
    expect(result.length).toBe(3);
  });
});

describe('computeMarketAnalysis', () => {
  it('combines radius, top ZIPs, and white space', () => {
    const analysis = computeMarketAnalysis({
      byZip,
      zipCentroids: centroids,
      focusLat: 34.09,
      focusLng: -118.41,
      radiusMiles: 50,
      competitors: [competitor],
    });
    expect(analysis.topZips[0]?.zip).toBe('90210');
    expect(analysis.audienceInRadius).toBeGreaterThan(0);
    expect(analysis.marketTotal).toBe(1700);
  });

  it('scopes top ZIPs to the trade area instead of the whole market', () => {
    // Tiny ring keeps only the focus ZIP; the larger 91786 must be excluded
    // from the ranking so the sidebar story stays coherent.
    const analysis = computeMarketAnalysis({
      byZip: { '90210': 200, '91786': 1000, '90632': 50 },
      zipCentroids: centroids,
      focusLat: 34.09,
      focusLng: -118.41,
      radiusMiles: 3,
      competitors: [],
    });
    expect(analysis.topZipsScope).toBe('trade-area');
    expect(analysis.zipsInRadius).toBe(1);
    expect(analysis.topZips.map(z => z.zip)).toEqual(['90210']);
    expect(analysis.radiusShare).toBeCloseTo(200 / 1250, 5);
  });

  it('falls back to whole-market ranking when no centroids resolve', () => {
    const analysis = computeMarketAnalysis({
      byZip,
      zipCentroids: {},
      focusLat: 34.09,
      focusLng: -118.41,
      radiusMiles: 25,
      competitors: [],
    });
    expect(analysis.topZipsScope).toBe('market');
    expect(analysis.zipsInRadius).toBe(0);
    expect(analysis.topZips[0]?.zip).toBe('90210');
  });
});
