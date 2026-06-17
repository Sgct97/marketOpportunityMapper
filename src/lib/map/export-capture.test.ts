import { describe, expect, it } from 'vitest';
import { boundsFromRadius } from './export-capture';
import { distanceMiles } from './radius';

describe('boundsFromRadius', () => {
  it('contains the full radius circle around the focus point', () => {
    const lng = -117.43;
    const lat = 34.09;
    const radiusMiles = 25;
    const { sw, ne } = boundsFromRadius(lng, lat, radiusMiles);

    // Corners of the bbox should be at least `radiusMiles` from center on each axis.
    expect(distanceMiles(lat, lng, sw[1], sw[0])).toBeGreaterThanOrEqual(radiusMiles - 0.5);
    expect(distanceMiles(lat, lng, ne[1], ne[0])).toBeGreaterThanOrEqual(radiusMiles - 0.5);
    expect(distanceMiles(lat, lng, sw[1], ne[0])).toBeGreaterThanOrEqual(radiusMiles - 0.5);
    expect(distanceMiles(lat, lng, ne[1], sw[0])).toBeGreaterThanOrEqual(radiusMiles - 0.5);
  });

  it('grows with larger radius selections', () => {
    const lng = -74.0;
    const lat = 40.7;
    const small = boundsFromRadius(lng, lat, 10);
    const large = boundsFromRadius(lng, lat, 50);

    const smallSpan = small.ne[0] - small.sw[0];
    const largeSpan = large.ne[0] - large.sw[0];
    expect(largeSpan).toBeGreaterThan(smallSpan * 4);
  });
});
