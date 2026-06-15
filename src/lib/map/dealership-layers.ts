import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type maplibregl from 'maplibre-gl';
import type { DealershipRow } from '@/lib/dealership/types';
import { circlePolygonCoordinates } from '@/lib/map/radius';

interface DealershipProperties {
  id: string;
  name: string;
  brand: string;
  role: string;
  focused: boolean;
}

export function dealershipsToGeoJson(
  dealers: DealershipRow[],
  focusDealershipId: string | null
): FeatureCollection<Point, DealershipProperties> {
  const features: Feature<Point, DealershipProperties>[] = [];

  for (const d of dealers) {
    if (d.latitude == null || d.longitude == null) continue;
    features.push({
      type: 'Feature',
      properties: {
        id: d.id,
        name: d.name,
        brand: d.brand,
        role: d.role,
        focused: d.id === focusDealershipId,
      },
      geometry: {
        type: 'Point',
        coordinates: [d.longitude, d.latitude],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function radiusToGeoJson(
  lng: number,
  lat: number,
  radiusMiles: number
): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { radiusMiles },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygonCoordinates(lng, lat, radiusMiles)],
        },
      },
    ],
  };
}

export function ensureDealershipLayers(map: maplibregl.Map, clientColor: string) {
  if (!map.getSource('radius-areas')) {
    map.addSource('radius-areas', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer('radius-fill')) {
    map.addLayer({
      id: 'radius-fill',
      type: 'fill',
      source: 'radius-areas',
      paint: {
        'fill-color': clientColor,
        'fill-opacity': 0.06,
      },
    });
  }

  if (!map.getLayer('radius-outline')) {
    map.addLayer({
      id: 'radius-outline',
      type: 'line',
      source: 'radius-areas',
      paint: {
        'line-color': clientColor,
        'line-width': 2,
        'line-opacity': 0.55,
        'line-dasharray': [2, 2],
      },
    });
  }

  if (!map.getSource('dealerships')) {
    map.addSource('dealerships', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer('dealership-pins')) {
    map.addLayer({
      id: 'dealership-pins',
      type: 'circle',
      source: 'dealerships',
      paint: {
        'circle-color': [
          'case',
          ['==', ['get', 'role'], 'client'],
          clientColor,
          '#64748B',
        ],
        'circle-radius': [
          'case',
          ['boolean', ['get', 'focused'], false],
          11,
          ['==', ['get', 'role'], 'client'],
          8,
          7,
        ],
        'circle-stroke-width': [
          'case',
          ['boolean', ['get', 'focused'], false],
          3,
          2,
        ],
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.95,
      },
    });
  }
}

export function setLayerVisibility(
  map: maplibregl.Map,
  layerIds: string[],
  visible: boolean
) {
  for (const id of layerIds) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  }
}

export function updateDealershipSources(
  map: maplibregl.Map,
  options: {
    dealers: DealershipRow[];
    focusDealershipId: string | null;
    radiusMiles: number;
    showRadius: boolean;
  }
) {
  const dealerSource = map.getSource('dealerships') as maplibregl.GeoJSONSource | undefined;
  dealerSource?.setData(dealershipsToGeoJson(options.dealers, options.focusDealershipId));

  const radiusSource = map.getSource('radius-areas') as maplibregl.GeoJSONSource | undefined;
  if (!options.showRadius || !options.focusDealershipId) {
    radiusSource?.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const focus = options.dealers.find(d => d.id === options.focusDealershipId);
  if (!focus || focus.latitude == null || focus.longitude == null) {
    radiusSource?.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  radiusSource?.setData(
    radiusToGeoJson(focus.longitude, focus.latitude, options.radiusMiles)
  );
}
