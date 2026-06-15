import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import { mergeAudienceIntoBoundaries } from './geojson';

const boundaries = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { ZCTA5: '90210' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-118.4, 34.1],
            [-118.3, 34.1],
            [-118.3, 34.0],
            [-118.4, 34.0],
            [-118.4, 34.1],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { ZCTA5: '10001' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.99, 40.75],
            [-73.98, 40.75],
            [-73.98, 40.74],
            [-73.99, 40.74],
            [-73.99, 40.75],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { GEOID: '75067' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-96.9, 33.0],
            [-96.8, 33.0],
            [-96.8, 32.9],
            [-96.9, 32.9],
            [-96.9, 33.0],
          ],
        ],
      },
    },
  ],
} as FeatureCollection<Geometry, { ZCTA5?: string; GEOID?: string }>;

describe('mergeAudienceIntoBoundaries', () => {
  it('merges counts for matching ZIPs only', () => {
    const byZip = { '90210': 1200, '10001': 0, '75067': 500 };
    const merged = mergeAudienceIntoBoundaries(boundaries, byZip, 'All segments');

    expect(merged.features).toHaveLength(2);
    expect(merged.features[0]?.properties?.audienceCount).toBe(1200);
    expect(merged.features[0]?.properties?.audienceTypeLabel).toBe('All segments');
    expect(merged.features[1]?.properties?.audienceCount).toBe(500);
  });

  it('resolves ZIP from GEOID when ZCTA5 absent', () => {
    const merged = mergeAudienceIntoBoundaries(boundaries, { '75067': 99 }, 'Test');
    expect(merged.features).toHaveLength(1);
    expect(merged.features[0]?.properties?.audienceCount).toBe(99);
  });

  it('returns empty collection when no counts match', () => {
    const merged = mergeAudienceIntoBoundaries(boundaries, {}, 'Test');
    expect(merged.features).toHaveLength(0);
  });
});
