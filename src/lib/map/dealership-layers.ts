import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type maplibregl from 'maplibre-gl';
import { competitorPinColor, competitorPinLabelColor } from '@/lib/brands';
import { clientDealerships, competitorDealerships } from '@/lib/dealership/filter';
import { rankCompetitors } from '@/lib/dealership/rank-competitors';
import type { DealershipRow } from '@/lib/dealership/types';
import type { MapTheme } from '@/lib/map/basemap';
import { CLIENT_STAR_IMAGE_ID, ensureClientStarImage } from '@/lib/map/client-star-icon';
import { circlePolygonCoordinates } from '@/lib/map/radius';

interface DealershipProperties {
  id: string;
  name: string;
  brand: string;
  role: string;
  focused: boolean;
  rank?: number;
  pinColor?: string;
  labelColor?: string;
}

export const CLIENT_DEALERSHIP_SOURCE = 'client-dealerships';
export const COMPETITOR_DEALERSHIP_SOURCE = 'competitor-dealerships';
export const CLIENT_DEALERSHIP_HALO_LAYER = 'client-dealership-halo';
export const CLIENT_DEALERSHIP_LAYER = 'client-dealership-pins';
export const COMPETITOR_DEALERSHIP_LAYER = 'competitor-dealership-pins';
export const COMPETITOR_DEALERSHIP_LABEL_LAYER = 'competitor-dealership-labels';
export const DEALERSHIP_PIN_LAYERS: string[] = [
  CLIENT_DEALERSHIP_HALO_LAYER,
  CLIENT_DEALERSHIP_LAYER,
  COMPETITOR_DEALERSHIP_LAYER,
  COMPETITOR_DEALERSHIP_LABEL_LAYER,
];

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

function rankedCompetitorsToGeoJson(
  ranked: ReturnType<typeof rankCompetitors>,
  theme: MapTheme = 'dark'
): FeatureCollection<Point, DealershipProperties> {
  const features: Feature<Point, DealershipProperties>[] = [];

  for (const d of ranked) {
    if (d.latitude == null || d.longitude == null) continue;
    const pinColor = competitorPinColor(d.brand, theme, d.name);
    features.push({
      type: 'Feature',
      properties: {
        id: d.id,
        name: d.name,
        brand: d.brand,
        role: d.role,
        focused: false,
        rank: d.rank,
        pinColor,
        labelColor: competitorPinLabelColor(pinColor),
      },
      geometry: {
        type: 'Point',
        coordinates: [d.longitude, d.latitude],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

function competitorPinPaint(): maplibregl.CirclePaint {
  return {
    'circle-color': ['coalesce', ['get', 'pinColor'], '#9FB1C9'],
    'circle-radius': 7,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
    'circle-opacity': 0.95,
  };
}

function competitorLabelPaint(): maplibregl.SymbolPaint {
  return {
    'text-color': ['coalesce', ['get', 'labelColor'], '#FFFFFF'],
    'text-halo-color': 'rgba(7,11,21,0.75)',
    'text-halo-width': 1,
  };
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

function removeLegacyClientDealershipLayer(map: maplibregl.Map) {
  const layer = map.getLayer(CLIENT_DEALERSHIP_LAYER);
  if (layer?.type === 'circle') {
    map.removeLayer(CLIENT_DEALERSHIP_LAYER);
  }
}

function ensureClientDealershipHalo(map: maplibregl.Map, clientColor: string) {
  if (!map.getLayer(CLIENT_DEALERSHIP_HALO_LAYER)) {
    map.addLayer({
      id: CLIENT_DEALERSHIP_HALO_LAYER,
      type: 'circle',
      source: CLIENT_DEALERSHIP_SOURCE,
      filter: ['==', ['get', 'focused'], true],
      paint: {
        'circle-color': clientColor,
        'circle-radius': 15,
        'circle-opacity': 0.22,
        'circle-blur': 0.55,
      },
    });
  } else {
    map.setPaintProperty(CLIENT_DEALERSHIP_HALO_LAYER, 'circle-color', clientColor);
  }
}

function ensureClientDealershipStar(map: maplibregl.Map, clientColor: string) {
  ensureClientStarImage(map, clientColor);
  removeLegacyClientDealershipLayer(map);

  const clientStarLayout: maplibregl.SymbolLayout = {
    'icon-image': CLIENT_STAR_IMAGE_ID,
    'icon-size': ['case', ['boolean', ['get', 'focused'], false], 1.08, 0.86],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  };

  if (!map.getLayer(CLIENT_DEALERSHIP_LAYER)) {
    map.addLayer({
      id: CLIENT_DEALERSHIP_LAYER,
      type: 'symbol',
      source: CLIENT_DEALERSHIP_SOURCE,
      layout: clientStarLayout,
    });
  } else {
    for (const [key, value] of Object.entries(clientStarLayout)) {
      map.setLayoutProperty(CLIENT_DEALERSHIP_LAYER, key, value);
    }
    map.moveLayer(CLIENT_DEALERSHIP_LAYER);
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
        'fill-opacity': 0.12,
      },
    });
  }

  // Soft glow underlay so the ring reads clearly over any basemap.
  if (!map.getLayer('radius-glow')) {
    map.addLayer({
      id: 'radius-glow',
      type: 'line',
      source: 'radius-areas',
      paint: {
        'line-color': clientColor,
        'line-width': 9,
        'line-opacity': 0.18,
        'line-blur': 6,
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
        'line-width': 3.5,
        'line-opacity': 0.95,
        'line-dasharray': [2, 1.4],
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

  ensureClientDealershipHalo(map, clientColor);

  if (!map.getLayer(COMPETITOR_DEALERSHIP_LAYER)) {
    map.addLayer({
      id: COMPETITOR_DEALERSHIP_LAYER,
      type: 'circle',
      source: COMPETITOR_DEALERSHIP_SOURCE,
      paint: competitorPinPaint(),
    });
  } else {
    for (const [key, value] of Object.entries(competitorPinPaint())) {
      map.setPaintProperty(COMPETITOR_DEALERSHIP_LAYER, key, value);
    }
  }

  if (!map.getLayer(COMPETITOR_DEALERSHIP_LABEL_LAYER)) {
    map.addLayer({
      id: COMPETITOR_DEALERSHIP_LABEL_LAYER,
      type: 'symbol',
      source: COMPETITOR_DEALERSHIP_SOURCE,
      layout: {
        'text-field': ['to-string', ['get', 'rank']],
        'text-size': 11,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: competitorLabelPaint(),
    });
  } else {
    for (const [key, value] of Object.entries(competitorLabelPaint())) {
      map.setPaintProperty(COMPETITOR_DEALERSHIP_LABEL_LAYER, key, value);
    }
  }

  ensureClientDealershipStar(map, clientColor);
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
    theme?: MapTheme;
  }
) {
  const clients = clientDealerships(options.dealers);
  const focusClient =
    clients.find(d => d.id === options.focusDealershipId) ?? clients[0] ?? null;
  const competitors = competitorDealerships(options.dealers, focusClient);
  const rankedCompetitors = rankCompetitors(competitors, focusClient);

  const clientSource = map.getSource(CLIENT_DEALERSHIP_SOURCE) as
    | maplibregl.GeoJSONSource
    | undefined;
  clientSource?.setData(
    dealershipsToGeoJson(clients, options.focusDealershipId)
  );

  const competitorSource = map.getSource(COMPETITOR_DEALERSHIP_SOURCE) as
    | maplibregl.GeoJSONSource
    | undefined;
  competitorSource?.setData(
    rankedCompetitorsToGeoJson(rankedCompetitors, options.theme ?? 'dark')
  );

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
