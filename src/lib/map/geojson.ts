import type { Feature, FeatureCollection, Geometry } from 'geojson';

interface BoundaryProperties {
  ZCTA5?: string;
  GEOID?: string;
  BASENAME?: string;
  audienceCount?: number;
  audienceTypeLabel?: string;
}

function featureZip(props: BoundaryProperties): string {
  const raw = props.ZCTA5 || props.GEOID || props.BASENAME || '';
  const match = String(raw).match(/\d{5}/);
  return match ? match[0] : '';
}

export function mergeAudienceIntoBoundaries(
  collection: FeatureCollection<Geometry, BoundaryProperties>,
  byZip: Record<string, number>,
  typeLabel: string
): FeatureCollection<Geometry, BoundaryProperties> {
  const features = collection.features
    .map(feature => {
      const zip = featureZip(feature.properties || {});
      const count = byZip[zip];
      if (!zip || count === undefined || count <= 0) return null;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          audienceCount: count,
          audienceTypeLabel: typeLabel,
        },
      } as Feature<Geometry, BoundaryProperties>;
    })
    .filter((f): f is Feature<Geometry, BoundaryProperties> => Boolean(f));

  return { type: 'FeatureCollection', features };
}
