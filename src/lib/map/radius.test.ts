import { describe, expect, it } from 'vitest';
import { circlePolygonCoordinates, distanceMiles } from './radius';

describe('circlePolygonCoordinates', () => {
  it('closes the ring', () => {
    const ring = circlePolygonCoordinates(-118.25, 34.05, 10, 8);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBeGreaterThan(4);
  });
});

describe('distanceMiles', () => {
  it('returns ~0 for same point', () => {
    expect(distanceMiles(34.05, -118.25, 34.05, -118.25)).toBeCloseTo(0, 5);
  });

  it('returns plausible distance for known separation', () => {
    const d = distanceMiles(34.05, -118.25, 34.15, -118.25);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(10);
  });
});
