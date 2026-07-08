'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import { aggregateAudienceByZip } from '@/lib/audience/aggregate';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import { segmentMetricsForZip } from '@/lib/audience/zip-exclude';
import type { ZipLabel } from '@/lib/map/zip-labels';
import type { DealershipRow } from '@/lib/dealership/types';
import type { RadiusMiles } from '@/lib/projects/settings';
import { resolveBasemapStyles, type MapTheme } from '@/lib/map/basemap';
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
  excludedZips?: string[];
  zipLabels?: Record<string, ZipLabel>;
  onToggleZipExcluded?: (zip: string) => void;
  onFocusDealership: (id: string) => void;
  /** When false the map is hidden (e.g. dashboard view); resize on re-show. */
  active?: boolean;
  /** Presentation theme — drives basemap + outline contrast. */
  theme?: MapTheme;
  /** Receives the map instance once layers are ready (null on unmount). Used for export capture. */
  onMapReady?: (map: maplibregl.Map | null) => void;
}

/**
 * Id of the first settlement-label (place_*) layer. Inserting the choropleth
 * before it puts the colored overlay ABOVE roads/buildings (so road lines stop
 * dominating the map) while keeping town & city names rendering on top, where
 * they stay legible. Falls back to the first symbol layer, then to the top.
 */
function placeLabelBeforeId(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle().layers ?? [];
  const place = layers.find(
    l => l.type === 'symbol' && l.id.startsWith('place')
  );
  if (place) return place.id;
  return layers.find(l => l.type === 'symbol')?.id;
}

/**
 * Make the basemap's town/city labels read clearly above the colored overlay:
 * a wider, theme-appropriate halo plus a small size bump, and tone the road
 * lines down so geography doesn't compete with the audience heat.
 */
function tuneBasemapLegibility(map: maplibregl.Map, theme: MapTheme) {
  const layers = map.getStyle().layers ?? [];
  const haloColor = theme === 'light' ? '#ffffff' : 'rgba(8, 13, 24, 0.92)';
  const textColor = theme === 'light' ? '#0f172a' : '#f1f5f9';

  for (const layer of layers) {
    if (layer.type === 'symbol' && layer.id.startsWith('place')) {
      try {
        map.setPaintProperty(layer.id, 'text-halo-color', haloColor);
        map.setPaintProperty(layer.id, 'text-halo-width', 1.8);
        map.setPaintProperty(layer.id, 'text-halo-blur', 0.4);
        map.setPaintProperty(layer.id, 'text-color', textColor);
      } catch {
        // Layer may lack a text symbol; ignore.
      }
    } else if (
      layer.type === 'line' &&
      (layer.id.startsWith('road') || layer.id.startsWith('bridge') || layer.id.startsWith('tunnel'))
    ) {
      try {
        map.setPaintProperty(layer.id, 'line-opacity', theme === 'light' ? 0.45 : 0.5);
      } catch {
        // Some line layers don't expose opacity; ignore.
      }
    }
  }
}

function ensureZipLayers(
  map: maplibregl.Map,
  rgb: ReturnType<typeof hexToRgb>,
  maxCount: number,
  theme: MapTheme
) {
  if (!map.getSource('zip-areas')) {
    map.addSource('zip-areas', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      generateId: true,
    });
  }

  const beforeId = placeLabelBeforeId(map);

  if (!map.getLayer('zip-fill')) {
    map.addLayer(
      {
        id: 'zip-fill',
        type: 'fill',
        source: 'zip-areas',
        paint: choroplethFillPaint(rgb, maxCount, theme),
      },
      beforeId
    );
  }

  if (!map.getLayer('zip-outline')) {
    map.addLayer(
      {
        id: 'zip-outline',
        type: 'line',
        source: 'zip-areas',
        paint: choroplethLinePaint(rgb, theme),
      },
      beforeId
    );
  }
}

function applyChoroplethPaint(
  map: maplibregl.Map,
  rgb: ReturnType<typeof hexToRgb>,
  maxCount: number,
  theme: MapTheme
) {
  if (map.getLayer('zip-fill')) {
    const fill = choroplethFillPaint(rgb, maxCount, theme);
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
    const line = choroplethLinePaint(rgb, theme);
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
  excludedZips = [],
  zipLabels = {},
  onToggleZipExcluded,
  onFocusDealership,
  active = true,
  theme = 'dark',
  onMapReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoverBoundRef = useRef(false);
  const clickBoundRef = useRef(false);
  const dealerBoundRef = useRef(false);
  const hoveredFeatureIdRef = useRef<string | number | null>(null);
  const onFocusRef = useRef(onFocusDealership);
  const focusIdRef = useRef(focusDealershipId);
  const onMapReadyRef = useRef(onMapReady);

  const onToggleZipExcludedRef = useRef(onToggleZipExcluded);
  const excludedZipsRef = useRef(excludedZips);
  const zipLabelsRef = useRef(zipLabels);
  const rowsRef = useRef(rows);

  const themeRef = useRef(theme);

  useEffect(() => {
    onFocusRef.current = onFocusDealership;
    focusIdRef.current = focusDealershipId;
    onMapReadyRef.current = onMapReady;
    onToggleZipExcludedRef.current = onToggleZipExcluded;
    excludedZipsRef.current = excludedZips;
    zipLabelsRef.current = zipLabels;
    rowsRef.current = rows;
    themeRef.current = theme;
  }, [onFocusDealership, focusDealershipId, onMapReady, onToggleZipExcluded, excludedZips, zipLabels, rows, theme]);

  const [layersReady, setLayersReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const boundaryDataRef = useRef<FeatureCollection<Geometry> | null>(null);

  const aggregate = useMemo(
    () => aggregateAudienceByZip(rows, selectedTypes),
    [rows, selectedTypes]
  );

  const zipsForBoundaries = useMemo(
    () =>
      aggregate.zips.filter(zip => (aggregate.byZip[zip] ?? 0) > 0).sort(),
    [aggregate]
  );

  const activeMaxCount = useMemo(() => {
    const excluded = new Set(excludedZips);
    let max = 0;
    for (const [zip, count] of Object.entries(aggregate.byZip)) {
      if (!excluded.has(zip) && count > max) max = count;
    }
    return max || 1;
  }, [aggregate.byZip, excludedZips]);

  const isEmptySelection =
    selectedTypes.length === 0 || zipsForBoundaries.length === 0;
  const displayedFeatureCount = isEmptySelection ? 0 : featureCount;

  const rgb = useMemo(() => hexToRgb(primaryColor), [primaryColor]);
  const mapStyles = useMemo(() => resolveBasemapStyles(theme), [theme]);

  const zipLayerStyleRef = useRef({
    activeMaxCount,
    rgb,
    theme,
    byZip: aggregate.byZip,
    typeLabel,
    excludedZips,
  });

  useEffect(() => {
    zipLayerStyleRef.current = {
      activeMaxCount,
      rgb,
      theme,
      byZip: aggregate.byZip,
      typeLabel,
      excludedZips,
    };
  }, [activeMaxCount, rgb, theme, aggregate.byZip, typeLabel, excludedZips]);

  const applyZipLayerData = useCallback((map: maplibregl.Map, rawBoundaries: FeatureCollection<Geometry>) => {
    const { activeMaxCount: max, rgb: layerRgb, theme: layerTheme, byZip, typeLabel: label, excludedZips: excluded } =
      zipLayerStyleRef.current;

    ensureZipLayers(map, layerRgb, max, layerTheme);
    applyChoroplethPaint(map, layerRgb, max, layerTheme);

    const merged = mergeAudienceIntoBoundaries(
      rawBoundaries as FeatureCollection<Geometry, { ZCTA5?: string }>,
      byZip,
      label,
      excluded
    );

    const source = map.getSource('zip-areas') as maplibregl.GeoJSONSource | undefined;
    source?.setData(merged);
    setFeatureCount(merged.features.length);

    if (merged.features.length === 0) {
      setBoundaryError(
        'No ZIP boundaries returned for this dataset. Census may be missing those ZIP codes.'
      );
      return merged;
    }

    setBoundaryError(null);
    return merged;
  }, []);

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
        const zip = String(props.ZCTA5 || props.GEOID || props.BASENAME || '');
        const count = Number(props.audienceCount ?? 0);
        const excluded = Boolean(props.excluded);
        const segments = segmentMetricsForZip(rowsRef.current, zip);
        const totalCount = segments.reduce((sum, seg) => sum + seg.count, 0);
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
              zip,
              typeLabel: String(props.audienceTypeLabel || typeLabel),
              count: totalCount > 0 ? totalCount : count,
              accentColor: primaryColor,
              segments,
              excluded,
              theme: themeRef.current,
              zipLabels: zipLabelsRef.current,
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

  const bindZipClickHandler = useCallback((map: maplibregl.Map) => {
    if (clickBoundRef.current) return;
    clickBoundRef.current = true;

    map.on('click', 'zip-fill', e => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const zip = String(
        feature.properties.ZCTA5 || feature.properties.GEOID || feature.properties.BASENAME || ''
      );
      if (!zip || !onToggleZipExcludedRef.current) return;
      onToggleZipExcludedRef.current(zip);
    });
  }, []);

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
      tuneBasemapLegibility(map, theme);
      ensureZipLayers(map, rgb, 1, theme);
      ensureDealershipLayers(map, primaryColor);
      bindHoverHandlers(map);
      bindZipClickHandler(map);
      bindDealershipHandlers(map);
      setLayersReady(true);
      setMapError(null);
      onMapReadyRef.current?.(map);
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
        // Required so the WebGL canvas can be read back for screenshot / PDF export.
        canvasContextAttributes: { preserveDrawingBuffer: true },
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
        maxWidth: '420px',
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
          if (styleIndex < mapStyles.length - 1) {
            styleIndex += 1;
            map.setStyle(mapStyles[styleIndex]!);
            map.once('load', onStyleReady);
            return;
          }
          setMapError('Basemap could not load. Check your network connection and refresh.');
        }
      });

      mapRef.current = map;
    };

    attachMap(mapStyles[0]!);

    return () => {
      cancelled = true;
      hoverBoundRef.current = false;
      clickBoundRef.current = false;
      dealerBoundRef.current = false;
      hoveredFeatureIdRef.current = null;
      onMapReadyRef.current?.(null);
      popupRef.current?.remove();
      popupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setLayersReady(false);
      setFeatureCount(0);
      boundaryDataRef.current = null;
    };
  }, [rgb, bindHoverHandlers, bindZipClickHandler, bindDealershipHandlers, primaryColor, mapStyles, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;

    setLayerVisibility(map, ['zip-fill', 'zip-outline'], showZipLayer);
    setLayerVisibility(map, [CLIENT_DEALERSHIP_LAYER], showClientDealershipLayer);
    setLayerVisibility(map, [COMPETITOR_DEALERSHIP_LAYER], showCompetitorLayer);
    setLayerVisibility(map, ['radius-fill', 'radius-glow', 'radius-outline'], showRadiusLayer);

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
    if (!map || !layersReady || !active) return;
    // Container had zero size while hidden (dashboard view); recompute on show.
    const raf = requestAnimationFrame(() => map.resize());
    return () => cancelAnimationFrame(raf);
  }, [active, layersReady]);

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
      boundaryDataRef.current = null;
      const source = map.getSource('zip-areas') as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: [] });
      setFeatureCount(0);
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

        boundaryDataRef.current = data;
        const merged = applyZipLayerData(mapInstance, data);

        if (!focusDealershipId && merged.features.length > 0) {
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
  }, [layersReady, isEmptySelection, zipsForBoundaries, focusDealershipId, applyZipLayerData]);

  useEffect(() => {
    const map = mapRef.current;
    const cached = boundaryDataRef.current;
    if (!map || !layersReady || isEmptySelection || !cached) return;
    applyZipLayerData(map, cached);
  }, [
    layersReady,
    isEmptySelection,
    applyZipLayerData,
    activeMaxCount,
    aggregate.byZip,
    typeLabel,
    excludedZips,
    rgb,
    theme,
  ]);

  return (
    <div
      className="relative flex-1 min-h-[400px] w-full mom-map-shell"
      style={{ background: 'var(--map-backdrop)' }}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {!layersReady && !mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: 'var(--map-backdrop)' }}
        >
          <p className="text-sm text-[var(--muted)] tracking-wide">Loading map…</p>
        </div>
      )}

      {boundaryLoading && (
        <div className="mom-map-chip absolute top-4 left-4 z-10">
          Loading ZIP boundaries…
        </div>
      )}

      {mapError && (
        <div className="mom-alert absolute top-4 left-4 right-4 z-10 max-w-md px-4 py-2.5 text-xs">
          {mapError}
        </div>
      )}

      {boundaryError && (
        <div className="mom-alert absolute top-14 left-4 right-4 z-10 max-w-md px-4 py-2.5 text-xs">
          {boundaryError}
        </div>
      )}

      {layersReady && !boundaryLoading && displayedFeatureCount > 0 && (
        <div className="mom-map-chip absolute bottom-5 left-5 z-10">
          <span className="font-semibold text-[var(--ink)] tnum">
            {displayedFeatureCount.toLocaleString('en-US')}
          </span>
          <span className="text-[var(--muted)]">
            {' '}
            ZIP{displayedFeatureCount === 1 ? '' : 's'} in market area
          </span>
        </div>
      )}

      {isEmptySelection && selectedTypes.length === 0 && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px] pointer-events-none"
          style={{ background: 'var(--map-veil)' }}
        >
          <p className="text-sm text-[var(--muted)]">Select at least one audience segment</p>
        </div>
      )}
    </div>
  );
}
