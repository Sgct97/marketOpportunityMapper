import { describe, expect, it } from 'vitest';
import { rankCompetitors } from './rank-competitors';
import type { DealershipRow } from './types';

function competitor(
  id: string,
  name: string,
  lat: number,
  lng: number
): DealershipRow {
  return {
    id,
    name,
    brand: 'Toyota',
    role: 'competitor',
    latitude: lat,
    longitude: lng,
    address: null,
    geocode_status: 'ok',
  };
}

const focus: DealershipRow = {
  id: 'client-1',
  name: 'Focus Dealer',
  brand: 'Hyundai',
  role: 'client',
  latitude: 34.0,
  longitude: -117.0,
  address: null,
  geocode_status: 'ok',
};

describe('rankCompetitors', () => {
  it('orders by distance from focus client', () => {
    const ranked = rankCompetitors(
      [
        competitor('far', 'Far Dealer', 35.0, -117.0),
        competitor('near', 'Near Dealer', 34.05, -117.0),
      ],
      focus
    );

    expect(ranked.map(c => c.id)).toEqual(['near', 'far']);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[1]?.rank).toBe(2);
    expect(ranked[0]?.distanceMiles).toBeLessThan(ranked[1]?.distanceMiles ?? 0);
  });

  it('breaks distance ties by name', () => {
    const ranked = rankCompetitors(
      [
        competitor('b', 'Bravo Motors', 34.05, -117.0),
        competitor('a', 'Alpha Motors', 34.05, -117.0),
      ],
      focus
    );

    expect(ranked.map(c => c.name)).toEqual(['Alpha Motors', 'Bravo Motors']);
  });

  it('falls back to name order when focus has no coordinates', () => {
    const ranked = rankCompetitors(
      [
        competitor('b', 'Bravo Motors', 34.05, -117.0),
        competitor('a', 'Alpha Motors', 34.1, -117.0),
      ],
      { ...focus, latitude: null, longitude: null }
    );

    expect(ranked.map(c => c.name)).toEqual(['Alpha Motors', 'Bravo Motors']);
    expect(ranked.every(c => c.distanceMiles == null)).toBe(true);
  });
});
