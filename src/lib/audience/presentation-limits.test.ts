import { describe, expect, it } from 'vitest';
import { computeMarketAnalysis } from './market-analysis';
import {
  TOP_SEGMENT_DISPLAY_COUNT,
  TOP_ZIP_DISPLAY_COUNT,
} from './presentation-limits';

describe('presentation limits', () => {
  it('uses top 8 for ranked ZIP lists by default', () => {
    const byZip: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      byZip[String(90000 + i)] = 1000 - i;
    }

    const centroids = Object.fromEntries(
      Object.keys(byZip).map(zip => [zip, { lat: 34.0 + Number(zip.slice(-2)) / 100, lng: -118.0 }])
    );

    const analysis = computeMarketAnalysis({
      byZip,
      zipCentroids: centroids,
      focusLat: 34.05,
      focusLng: -118.0,
      radiusMiles: 25,
      competitors: [],
    });

    expect(analysis.topZips).toHaveLength(TOP_ZIP_DISPLAY_COUNT);
    expect(TOP_ZIP_DISPLAY_COUNT).toBe(8);
    expect(TOP_SEGMENT_DISPLAY_COUNT).toBe(8);
  });
});
