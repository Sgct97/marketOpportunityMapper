import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

export interface LatLng {
  lat: number;
  lng: number;
}

function zipFromProperties(props: Record<string, unknown> | null | undefined): string {
  const raw = props?.ZCTA5 ?? props?.GEOID ?? props?.BASENAME ?? '';
  const match = String(raw).match(/\d{5}/);
  return match ? match[0] : '';
}

function ringCentroid(ring: Position[]): LatLng | null {
  if (ring.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;

  for (const coord of ring) {
    if (coord.length < 2) continue;
    sumLng += coord[0]!;
    sumLat += coord[1]!;
    count += 1;
  }

  if (count === 0) return null;
  return { lng: sumLng / count, lat: sumLat / count };
}

/** Simple geometric centroid (ZIP-scale approximation; not area-weighted). */
export function centroidOfGeometry(geometry: Geometry): LatLng | null {
  if (geometry.type === 'Polygon') {
    return ringCentroid(geometry.coordinates[0] ?? []);
  }
  if (geometry.type === 'MultiPolygon') {
    const first = geometry.coordinates[0]?.[0];
    return first ? ringCentroid(first) : null;
  }
  return null;
}

export function centroidsFromBoundaries(
  collection: FeatureCollection<Geometry>
): Record<string, LatLng> {
  const centroids: Record<string, LatLng> = {};

  for (const feature of collection.features) {
    const zip = zipFromProperties(feature.properties as Record<string, unknown>);
    if (!zip || !feature.geometry) continue;
    const centroid = centroidOfGeometry(feature.geometry);
    if (centroid) centroids[zip] = centroid;
  }

  return centroids;
}

export function centroidOfFeature(feature: Feature<Geometry>): LatLng | null {
  if (!feature.geometry) return null;
  return centroidOfGeometry(feature.geometry);
}
