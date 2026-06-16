import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type maplibregl from 'maplibre-gl';
import { clientDealerships, competitorDealerships } from '@/lib/dealership/filter';
import type { DealershipRow } from '@/lib/dealership/types';
import { circlePolygonCoordinates } from '@/lib/map/radius';

interface DealershipProperties {
  id: string;
  name: string;
  brand: string;
  role: string;
  focused: boolean;
}

export const CLIENT_DEALERSHIP_SOURCE = 'client-dealerships';
export const COMPETITOR_DEALERSHIP_SOURCE = 'competitor-dealerships';
export const CLIENT_DEALERSHIP_LAYER = 'client-dealership-pins';
export const COMPETITOR_DEALERSHIP_LAYER = 'competitor-dealership-pins';
export const DEALERSHIP_PIN_LAYERS: string[] = [CLIENT_DEALERSHIP_LAYER, COMPETITOR_DEALERSHIP_LAYER];

const LEGACY_DEALERSHIP_LAYER = 'dealership-pins';

function dealershipsToGeoJson(
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

function removeLegacyDealershipLayer(map: maplibregl.Map) {
  if (map.getLayer(LEGACY_DEALERSHIP_LAYER)) {
    map.removeLayer(LEGACY_DEALERSHIP_LAYER);
  }
}

export function ensureDealershipLayers(map: maplibregl.Map, clientColor: string) {
  removeLegacyDealershipLayer(map);

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
        'fill-opacity': 0.09,
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

  if (!map.getSource(CLIENT_DEALERSHIP_SOURCE)) {
    map.addSource(CLIENT_DEALERSHIP_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getSource(COMPETITOR_DEALERSHIP_SOURCE)) {
    map.addSource(COMPETITOR_DEALERSHIP_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(CLIENT_DEALERSHIP_LAYER)) {
    map.addLayer({
      id: CLIENT_DEALERSHIP_LAYER,
      type: 'circle',
      source: CLIENT_DEALERSHIP_SOURCE,
      paint: {
        'circle-color': clientColor,
        'circle-radius': ['case', ['boolean', ['get', 'focused'], false], 11, 8],
        'circle-stroke-width': ['case', ['boolean', ['get', 'focused'], false], 3, 2],
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.95,
      },
    });
  }

  if (!map.getLayer(COMPETITOR_DEALERSHIP_LAYER)) {
    map.addLayer({
      id: COMPETITOR_DEALERSHIP_LAYER,
      type: 'circle',
      source: COMPETITOR_DEALERSHIP_SOURCE,
      paint: {
        'circle-color': '#9FB1C9',
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(7,11,21,0.9)',
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
  const clients = clientDealerships(options.dealers);
  const focusClient =
    clients.find(d => d.id === options.focusDealershipId) ?? clients[0] ?? null;
  const competitors = competitorDealerships(options.dealers, focusClient);

  const clientSource = map.getSource(CLIENT_DEALERSHIP_SOURCE) as
    | maplibregl.GeoJSONSource
    | undefined;
  clientSource?.setData(
    dealershipsToGeoJson(clients, options.focusDealershipId)
  );

  const competitorSource = map.getSource(COMPETITOR_DEALERSHIP_SOURCE) as
    | maplibregl.GeoJSONSource
    | undefined;
  competitorSource?.setData(dealershipsToGeoJson(competitors, null));

  const radiusSource = map.getSource('radius-areas') as maplibregl.GeoJSONSource | undefined;
  if (!options.showRadius || !options.focusDealershipId) {
    radiusSource?.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const focus = focusClient;
  if (!focus?.latitude || !focus?.longitude) {
    radiusSource?.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  radiusSource?.setData(
    radiusToGeoJson(focus.longitude, focus.latitude, options.radiusMiles)
  );
}
