'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import { aggregateAudienceByZip } from '@/lib/audience/aggregate';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import type { DealershipRow } from '@/lib/dealership/types';
import type { RadiusMiles } from '@/lib/projects/settings';
import { resolveBasemapStyles } from '@/lib/map/basemap';
import { choroplethFillPaint, choroplethLinePaint } from '@/lib/map/choropleth';
import { hexToRgb } from '@/lib/map/colors';
import { fetchZipBoundaries } from '@/lib/map/boundaries';
import {
  CLIENT_DEALERSHIP_LAYER,
  COMPETITOR_DEALERSHIP_LAYER,
  DEALERSHIP_PIN_LAYERS,
  ensureDealershipLayers,
  setLayerVisibility,
  updateDealershipSources,
} from '@/lib/map/dealership-layers';
import { dealershipPopupHtml } from '@/lib/map/dealership-popup';
import { mergeAudienceIntoBoundaries } from '@/lib/map/geojson';
import { audiencePopupHtml } from '@/lib/map/popup';

const MAP_STYLES = resolveBasemapStyles();

interface Props {
  rows: AudienceZipRow[];
  selectedTypes: string[];
  primaryColor: string;
  typeLabel: string;
  dealerships: DealershipRow[];
  focusDealershipId: string | null;
  radiusMiles: RadiusMiles;
  showZipLayer: boolean;
  showClientDealershipLayer: boolean;
  showCompetitorLayer: boolean;
  showRadiusLayer: boolean;
  onFocusDealership: (id: string) => void;
}

function ensureZipLayers(
  map: maplibregl.Map,
  rgb: ReturnType<typeof hexToRgb>,
  maxCount: number
) {
  if (!map.getSource('zip-areas')) {
    map.addSource('zip-areas', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      generateId: true,
    });
  }

  if (!map.getLayer('zip-fill')) {
    map.addLayer({
      id: 'zip-fill',
      type: 'fill',
      source: 'zip-areas',
      paint: choroplethFillPaint(rgb, maxCount),
    });
  }

  if (!map.getLayer('zip-outline')) {
    map.addLayer({
      id: 'zip-outline',
      type: 'line',
      source: 'zip-areas',
      paint: choroplethLinePaint(rgb),
    });
  }
}

function applyChoroplethPaint(
  map: maplibregl.Map,
  rgb: ReturnType<typeof hexToRgb>,
  maxCount: number
) {
  if (map.getLayer('zip-fill')) {
    const fill = choroplethFillPaint(rgb, maxCount);
    if (fill) {
      if ('fill-color' in fill && fill['fill-color'] != null) {
        map.setPaintProperty('zip-fill', 'fill-color', fill['fill-color']);
      }
      if ('fill-opacity' in fill && fill['fill-opacity'] != null) {
        map.setPaintProperty('zip-fill', 'fill-opacity', fill['fill-opacity']);
      }
    }
  }
  if (map.getLayer('zip-outline')) {
    const line = choroplethLinePaint(rgb);
    if (line) {
      if (line['line-color'] != null) map.setPaintProperty('zip-outline', 'line-color', line['line-color']);
      if (line['line-width'] != null) map.setPaintProperty('zip-outline', 'line-width', line['line-width']);
      if (line['line-opacity'] != null) {
        map.setPaintProperty('zip-outline', 'line-opacity', line['line-opacity']);
      }
    }
  }
}

function extendBoundsFromFeature(bounds: maplibregl.LngLatBounds, feature: GeoJSON.Feature<Geometry>) {
  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      for (const coord of ring) {
        bounds.extend(coord as [number, number]);
      }
    }
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        for (const coord of ring) {
          bounds.extend(coord as [number, number]);
        }
      }
    }
  }
}

export function OpportunityMap({
  rows,
  selectedTypes,
  primaryColor,
  typeLabel,
  dealerships,
  focusDealershipId,
  radiusMiles,
  showZipLayer,
  showClientDealershipLayer,
  showCompetitorLayer,
  showRadiusLayer,
  onFocusDealership,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoverBoundRef = useRef(false);
  const dealerBoundRef = useRef(false);
  const hoveredFeatureIdRef = useRef<string | number | null>(null);
  const onFocusRef = useRef(onFocusDealership);
  const focusIdRef = useRef(focusDealershipId);

  useEffect(() => {
    onFocusRef.current = onFocusDealership;
    focusIdRef.current = focusDealershipId;
  }, [onFocusDealership, focusDealershipId]);

  const [layersReady, setLayersReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);

  const aggregate = useMemo(
    () => aggregateAudienceByZip(rows, selectedTypes),
    [rows, selectedTypes]
  );

  const zipsForBoundaries = useMemo(
    () =>
      aggregate.zips.filter(zip => (aggregate.byZip[zip] ?? 0) > 0).sort(),
    [aggregate]
  );

  const isEmptySelection =
    selectedTypes.length === 0 || zipsForBoundaries.length === 0;
  const displayedFeatureCount = isEmptySelection ? 0 : featureCount;

  const rgb = useMemo(() => hexToRgb(primaryColor), [primaryColor]);

  const clearHoverState = useCallback((map: maplibregl.Map) => {
    const id = hoveredFeatureIdRef.current;
    if (id != null) {
      map.removeFeatureState({ source: 'zip-areas', id });
      hoveredFeatureIdRef.current = null;
    }
  }, []);

  const bindHoverHandlers = useCallback(
    (map: maplibregl.Map) => {
      if (hoverBoundRef.current) return;
      hoverBoundRef.current = true;

      map.on('mousemove', 'zip-fill', e => {
        if (!e.features?.[0]) return;
        const feature = e.features[0];
        const props = feature.properties || {};
        const zip = props.ZCTA5 || props.GEOID || props.BASENAME || '';
        const count = Number(props.audienceCount ?? 0);
        const featureId = feature.id;

        if (featureId != null && hoveredFeatureIdRef.current !== featureId) {
          clearHoverState(map);
          hoveredFeatureIdRef.current = featureId;
          map.setFeatureState({ source: 'zip-areas', id: featureId }, { hover: true });
        }

        map.getCanvas().style.cursor = 'pointer';
        popupRef.current
          ?.setLngLat(e.lngLat)
          .setHTML(
            audiencePopupHtml({
              zip: String(zip),
              typeLabel: String(props.audienceTypeLabel || typeLabel),
              count,
              accentColor: primaryColor,
            })
          )
          .addTo(map);
      });

      map.on('mouseleave', 'zip-fill', () => {
        map.getCanvas().style.cursor = '';
        popupRef.current?.remove();
        clearHoverState(map);
      });
    },
    [typeLabel, primaryColor, clearHoverState]
  );

  const bindDealershipHandlers = useCallback((map: maplibregl.Map) => {
    if (dealerBoundRef.current) return;
    dealerBoundRef.current = true;

    map.on('mouseenter', DEALERSHIP_PIN_LAYERS, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', DEALERSHIP_PIN_LAYERS, () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    map.on('click', DEALERSHIP_PIN_LAYERS, e => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const id = String(feature.properties.id ?? '');
      const role = String(feature.properties.role ?? '');
      if (id && role === 'client') {
        onFocusRef.current(id);
      }
    });

    map.on('mousemove', DEALERSHIP_PIN_LAYERS, e => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const props = feature.properties;
      popupRef.current
        ?.setLngLat(e.lngLat)
        .setHTML(
          dealershipPopupHtml({
            name: String(props.name ?? ''),
            brand: String(props.brand ?? ''),
            role: props.role === 'client' ? 'client' : 'competitor',
            accentColor: primaryColor,
            isFocus: String(props.id) === focusIdRef.current,
          })
        )
        .addTo(map);
    });
  }, [primaryColor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let styleIndex = 0;
    let cancelled = false;

    const initLayers = (map: maplibregl.Map) => {
      if (cancelled) return;
      ensureZipLayers(map, rgb, aggregate.maxCount || 1);
      ensureDealershipLayers(map, primaryColor);
      bindHoverHandlers(map);
      bindDealershipHandlers(map);
      setLayersReady(true);
      setMapError(null);
      requestAnimationFrame(() => map.resize());
    };

    const attachMap = (styleUrl: string) => {
      const map = new maplibregl.Map({
        container,
        style: styleUrl,
        center: [-98.5795, 39.8283],
        zoom: 4,
        attributionControl: { compact: true },
        fadeDuration: 0,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
        'top-right'
      );
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'mom-popup',
        offset: 12,
        maxWidth: '240px',
      });

      const onStyleReady = () => initLayers(map);
      if (map.isStyleLoaded()) {
        onStyleReady();
      } else {
        map.once('load', onStyleReady);
      }

      map.on('error', e => {
        if (cancelled) return;
        const message = e.error?.message ?? '';
        if (message.includes('Failed to load') || message.includes('style')) {
          if (styleIndex < MAP_STYLES.length - 1) {
            styleIndex += 1;
            map.setStyle(MAP_STYLES[styleIndex]!);
            map.once('load', onStyleReady);
            return;
          }
          setMapError('Basemap could not load. Check your network connection and refresh.');
        }
      });

      mapRef.current = map;
    };

    attachMap(MAP_STYLES[0]!);

    return () => {
      cancelled = true;
      hoverBoundRef.current = false;
      dealerBoundRef.current = false;
      hoveredFeatureIdRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setLayersReady(false);
      setFeatureCount(0);
    };
  }, [rgb, bindHoverHandlers, bindDealershipHandlers, aggregate.maxCount, primaryColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;

    setLayerVisibility(map, ['zip-fill', 'zip-outline'], showZipLayer);
    setLayerVisibility(map, [CLIENT_DEALERSHIP_LAYER], showClientDealershipLayer);
    setLayerVisibility(map, [COMPETITOR_DEALERSHIP_LAYER], showCompetitorLayer);
    setLayerVisibility(map, ['radius-fill', 'radius-outline'], showRadiusLayer);

    updateDealershipSources(map, {
      dealers: dealerships,
      focusDealershipId,
      radiusMiles,
      showRadius: showRadiusLayer,
    });
  }, [
    layersReady,
    dealerships,
    focusDealershipId,
    radiusMiles,
    showZipLayer,
    showClientDealershipLayer,
    showCompetitorLayer,
    showRadiusLayer,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady || !focusDealershipId) return;

    const focus = dealerships.find(d => d.id === focusDealershipId);
    if (!focus || focus.latitude == null || focus.longitude == null) return;

    map.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: Math.max(map.getZoom(), 10),
      duration: 800,
    });
  }, [layersReady, focusDealershipId, dealerships]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;

    if (isEmptySelection) {
      const source = map.getSource('zip-areas') as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const controller = new AbortController();
    let loading = true;
    queueMicrotask(() => {
      if (!controller.signal.aborted && loading) {
        setBoundaryLoading(true);
        setBoundaryError(null);
      }
    });

    fetchZipBoundaries(zipsForBoundaries, controller.signal)
      .then(data => {
        const mapInstance = mapRef.current;
        if (!mapInstance || controller.signal.aborted) return;

        const max = aggregate.maxCount || 1;
        ensureZipLayers(mapInstance, rgb, max);
        applyChoroplethPaint(mapInstance, rgb, max);

        const merged = mergeAudienceIntoBoundaries(
          data as FeatureCollection<Geometry, { ZCTA5?: string }>,
          aggregate.byZip,
          typeLabel
        );

        const source = mapInstance.getSource('zip-areas') as maplibregl.GeoJSONSource | undefined;
        source?.setData(merged);
        setFeatureCount(merged.features.length);

        if (merged.features.length === 0) {
          setBoundaryError(
            'No ZIP boundaries returned for this dataset. Census may be missing those ZIP codes.'
          );
          return;
        }

        setBoundaryError(null);

        if (!focusDealershipId) {
          const bounds = new maplibregl.LngLatBounds();
          for (const feature of merged.features) {
            extendBoundsFromFeature(bounds, feature);
          }
          if (!bounds.isEmpty()) {
            mapInstance.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: 900 });
          }
        }
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setBoundaryError('ZIP boundaries could not be loaded. Try again in a moment.');
        setFeatureCount(0);
      })
      .finally(() => {
        loading = false;
        if (!controller.signal.aborted) setBoundaryLoading(false);
      });

    return () => {
      loading = false;
      controller.abort();
    };
  }, [
    layersReady,
    isEmptySelection,
    zipsForBoundaries,
    aggregate.byZip,
    aggregate.maxCount,
    typeLabel,
    rgb,
    focusDealershipId,
  ]);

  return (
    <div className="relative flex-1 min-h-[400px] w-full bg-[#F1F5F9] mom-map-shell">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {!layersReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[#F8FAFC]">
          <p className="text-sm text-[#64748B] tracking-wide">Loading map…</p>
        </div>
      )}

      {boundaryLoading && (
        <div className="mom-map-chip absolute top-4 left-4 z-10">
          Loading ZIP boundaries…
        </div>
      )}

      {mapError && (
        <div className="absolute top-4 left-4 right-4 z-10 max-w-md bg-[#FFF5F5] border border-[#FECACA] px-4 py-2.5 text-xs text-[#B91C1C] shadow-sm">
          {mapError}
        </div>
      )}

      {boundaryError && (
        <div className="absolute top-14 left-4 right-4 z-10 max-w-md bg-[#FFF5F5] border border-[#FECACA] px-4 py-2.5 text-xs text-[#B91C1C] shadow-sm">
          {boundaryError}
        </div>
      )}

      {layersReady && !boundaryLoading && displayedFeatureCount > 0 && (
        <div className="mom-map-chip absolute bottom-5 left-5 z-10">
          <span className="font-medium text-[#334155]">
            {displayedFeatureCount.toLocaleString('en-US')}
          </span>
          <span className="text-[#64748B]">
            {' '}
            ZIP{displayedFeatureCount === 1 ? '' : 's'} in market area
          </span>
        </div>
      )}

      {isEmptySelection && selectedTypes.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F8FAFC]/80 backdrop-blur-[1px] pointer-events-none">
          <p className="text-sm text-[#64748B]">Select at least one audience segment</p>
        </div>
      )}
    </div>
  );
}
