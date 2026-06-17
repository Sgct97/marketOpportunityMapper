'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  aggregateAudienceByZip,
  listAudienceTypes,
} from '@/lib/audience/aggregate';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import { buildDashboardModel } from '@/lib/audience/dashboard';
import { computeMarketAnalysis } from '@/lib/audience/market-analysis';
import {
  clientDealerships,
  competitorDealerships,
} from '@/lib/dealership/filter';
import type { DealershipRow } from '@/lib/dealership/types';
import { resolveBrandAccent } from '@/lib/brands';
import { fetchZipBoundaries } from '@/lib/map/boundaries';
import { centroidsFromBoundaries } from '@/lib/map/centroids';
import type { LatLng } from '@/lib/map/centroids';
import {
  parseProjectMapSettings,
  RADIUS_MILES_OPTIONS,
  type ProjectMapSettings,
  type RadiusMiles,
} from '@/lib/projects/settings';
import { saveProjectMapSettings } from '@/app/actions/project-settings';
import { captureMapForExport } from '@/lib/map/export-capture';
import { MapView } from '@/components/map/MapView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import {
  PresentationHeader,
  type PresentationTheme,
  type PresentationView,
} from './PresentationHeader';

const THEME_STORAGE_KEY = 'mom-presentation-theme';

interface Props {
  projectId: string;
  projectName: string;
  brandId: string;
  datasetLabel: string | null;
  rows: AudienceZipRow[];
  dealerships: DealershipRow[];
  initialSettings: ProjectMapSettings;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'market-opportunity'
  );
}

function resolveInitialFocus(
  dealers: DealershipRow[],
  settings: ProjectMapSettings
): string | null {
  const clients = clientDealerships(dealers);
  if (settings.focusDealershipId && clients.some(d => d.id === settings.focusDealershipId)) {
    return settings.focusDealershipId;
  }
  return clients[0]?.id ?? null;
}

export function PresentationWorkspace({
  projectId,
  projectName,
  brandId,
  datasetLabel,
  rows,
  dealerships,
  initialSettings,
}: Props) {
  // `parseProjectMapSettings` already fills sensible defaults, so initial state
  // reads from the saved project settings (radius, layer visibility, focus).
  const parsed = parseProjectMapSettings(initialSettings);

  const audienceTypes = useMemo(() => listAudienceTypes(rows), [rows]);
  const clientOptions = useMemo(() => clientDealerships(dealerships), [dealerships]);

  const [view, setView] = useState<PresentationView>('map');
  // Default to dark on both server and first client render to avoid a hydration
  // mismatch; the saved preference is applied in an effect after mount.
  const [theme, setTheme] = useState<PresentationTheme>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => listAudienceTypes(rows));
  const [focusDealershipId, setFocusDealershipId] = useState<string | null>(
    () => resolveInitialFocus(dealerships, parsed)
  );
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(parsed.radiusMiles ?? 25);
  const [showZipLayer, setShowZipLayer] = useState(parsed.showZipLayer !== false);
  const [showClientDealershipLayer, setShowClientDealershipLayer] = useState(
    parsed.showClientDealershipLayer !== false
  );
  const [showCompetitorLayer, setShowCompetitorLayer] = useState(
    parsed.showCompetitorLayer !== false
  );
  const [showRadiusLayer, setShowRadiusLayer] = useState(parsed.showRadiusLayer !== false);

  const focusDealership = useMemo(
    () => clientOptions.find(d => d.id === focusDealershipId) ?? null,
    [clientOptions, focusDealershipId]
  );

  const clientBrand = focusDealership?.brand ?? clientOptions[0]?.brand ?? null;

  const brand = useMemo(
    () =>
      resolveBrandAccent({
        brandId,
        clientBrand,
        fileName: datasetLabel,
        projectName,
        segmentNames: audienceTypes,
      }),
    [brandId, clientBrand, datasetLabel, projectName, audienceTypes]
  );

  const aggregate = useMemo(
    () => aggregateAudienceByZip(rows, selectedTypes),
    [rows, selectedTypes]
  );

  const typeLabel =
    selectedTypes.length === audienceTypes.length
      ? 'All segments'
      : selectedTypes.length === 1
        ? selectedTypes[0]!
        : `${selectedTypes.length} segments`;

  const zipCountWithData = aggregate.zips.filter(z => (aggregate.byZip[z] ?? 0) > 0).length;

  // Centroids for every ZIP with audience (stable across segment toggles), so
  // both the map sidebar and the dashboard can compute trade-area metrics.
  const allDataZips = useMemo(
    () => Array.from(new Set(rows.filter(r => r.audience_count > 0).map(r => r.zip))).sort(),
    [rows]
  );

  const [zipCentroids, setZipCentroids] = useState<Record<string, LatLng>>({});

  useEffect(() => {
    if (allDataZips.length === 0) return;
    const controller = new AbortController();
    fetchZipBoundaries(allDataZips, controller.signal)
      .then(fc => setZipCentroids(centroidsFromBoundaries(fc)))
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setZipCentroids({});
      });
    return () => controller.abort();
  }, [allDataZips]);

  const competitorOptions = useMemo(
    () => competitorDealerships(dealerships, focusDealership),
    [dealerships, focusDealership]
  );

  const competitorsForMap = useMemo(
    () => (showCompetitorLayer ? competitorOptions : []),
    [showCompetitorLayer, competitorOptions]
  );

  const hasFocus = Boolean(focusDealership?.latitude && focusDealership?.longitude);

  const marketAnalysis = useMemo(() => {
    if (selectedTypes.length === 0 || !focusDealership?.latitude || !focusDealership?.longitude) {
      return null;
    }
    return computeMarketAnalysis({
      byZip: aggregate.byZip,
      zipCentroids,
      focusLat: focusDealership.latitude,
      focusLng: focusDealership.longitude,
      radiusMiles,
      competitors: competitorsForMap,
    });
  }, [aggregate.byZip, zipCentroids, focusDealership, radiusMiles, competitorsForMap, selectedTypes.length]);

  // Dashboard always uses the full dataset (all segments) and all competitors,
  // independent of the map's filters.
  const dashboardModel = useMemo(
    () =>
      buildDashboardModel({
        rows,
        zipCentroids,
        focus: focusDealership
          ? { latitude: focusDealership.latitude, longitude: focusDealership.longitude }
          : null,
        radiusMiles,
        competitors: competitorOptions,
      }),
    [rows, zipCentroids, focusDealership, radiusMiles, competitorOptions]
  );

  const persistSettings = useCallback(
    (patch: Partial<ProjectMapSettings>) => {
      void saveProjectMapSettings(projectId, patch);
    },
    [projectId]
  );

  // Live MapLibre instance, captured for screenshot / PDF export.
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  const exportFocus = useMemo(() => {
    if (focusDealership?.latitude == null || focusDealership?.longitude == null) return null;
    return { longitude: focusDealership.longitude, latitude: focusDealership.latitude };
  }, [focusDealership]);

  const prepareMapForCapture = useCallback(async () => {
    if (view !== 'map') {
      setView('map');
      // Give React + MapLibre time to show the pane and attach a real canvas size.
      await new Promise<void>(resolve => setTimeout(resolve, 120));
    }
    mapInstanceRef.current?.resize();
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  }, [view]);

  const captureExportImage = useCallback(async () => {
    await prepareMapForCapture();
    const capture = captureMapForExport(mapInstanceRef.current, exportFocus, radiusMiles);
    // Hard ceiling so Export never hangs indefinitely if the map misbehaves.
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 10_000));
    return Promise.race([capture, timeout]);
  }, [prepareMapForCapture, exportFocus, radiusMiles]);

  const handleExportPng = useCallback(async () => {
    const image = await captureExportImage();
    if (!image) {
      window.alert('The map is still loading — open the Map view, then try exporting again.');
      return;
    }
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = `${slugify(projectName)}-map.png`;
    link.click();
  }, [captureExportImage, projectName]);

  const handleExportPdf = useCallback(async () => {
    const image = await captureExportImage();
    if (!image) {
      window.alert(
        'Could not capture the map in time. Stay on the Map view, wait for tiles to load, then try again.'
      );
      return;
    }
    const { buildMarketReport } = await import('@/lib/export/report');
    const { getAgencyBrand, loadLogoDataUrl } = await import('@/lib/agency-brand');
    const agencyBrand = getAgencyBrand(brandId);
    const logoDataUrl = await loadLogoDataUrl(agencyBrand.logo);
    const doc = buildMarketReport({
      brand,
      agencyBrand,
      logoDataUrl,
      projectName,
      datasetLabel,
      focusName: focusDealership?.name ?? null,
      radiusMiles,
      model: dashboardModel,
      mapImage: image,
    });
    doc.save(`${slugify(projectName)}-market-report.pdf`);
  }, [captureExportImage, brand, brandId, projectName, datasetLabel, focusDealership, radiusMiles, dashboardModel]);

  function toggleType(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function persistLayerVisibility(client: boolean, competitor: boolean) {
    persistSettings({ showClientDealershipLayer: client, showCompetitorLayer: competitor });
  }

  function handleFocusDealership(id: string) {
    setFocusDealershipId(id);
    persistSettings({ focusDealershipId: id });
  }

  function handleRadiusChange(miles: RadiusMiles) {
    setRadiusMiles(miles);
    persistSettings({ radiusMiles: miles });
  }

  const contextLabel = focusDealership
    ? `${focusDealership.name} · ${radiusMiles} mi radius`
    : datasetLabel;

  // Expose the brand palette as CSS vars; the active theme (`.mom-canvas` /
  // `[data-theme="light"]`) maps these to `--accent` etc. On dark the accent is
  // the luminous `glow`; on light it's the true brand hue.
  const brandVars = {
    ['--brand-primary']: brand.primaryColor,
    ['--brand-primary-dark']: brand.primaryDark,
    ['--brand-primary-soft']: brand.primarySoft,
    ['--brand-primary-line']: brand.primaryLine,
    ['--brand-glow']: brand.glow,
    ['--brand-glow-deep']: brand.glowDeep,
    ['--brand-glow-soft']: brand.glowSoft,
    ['--brand-glow-line']: brand.glowLine,
    ['--brand-on']: brand.onPrimary,
  } as React.CSSProperties;

  // Data-viz accent that reads on the active surface (map choropleth/pins,
  // dashboard charts): luminous glow on dark, true brand hue on light.
  const accentColor = theme === 'light' ? brand.primaryColor : brand.glow;

  return (
    <div className="mom-canvas flex flex-col h-screen" data-theme={theme} style={brandVars}>
      <PresentationHeader
        projectId={projectId}
        projectName={projectName}
        brandName={brand.name}
        view={view}
        onViewChange={setView}
        contextLabel={contextLabel}
        theme={theme}
        onToggleTheme={toggleTheme}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
      />

      <div className="flex flex-1 min-h-0">
        <div className={`flex-1 min-h-0 ${view === 'map' ? 'flex' : 'hidden'}`}>
          <MapView
            active={view === 'map'}
            theme={theme}
            rows={rows}
            selectedTypes={selectedTypes}
            primaryColor={accentColor}
            typeLabel={typeLabel}
            dealerships={dealerships}
            focusDealershipId={focusDealershipId}
            radiusMiles={radiusMiles}
            showZipLayer={showZipLayer}
            showClientDealershipLayer={showClientDealershipLayer}
            showCompetitorLayer={showCompetitorLayer}
            showRadiusLayer={showRadiusLayer}
            onFocusDealership={handleFocusDealership}
            audienceTypes={audienceTypes}
            onToggleType={toggleType}
            onSelectAll={() => setSelectedTypes([...audienceTypes])}
            onClearAll={() => setSelectedTypes([])}
            totalAudience={aggregate.totalAudience}
            zipCount={zipCountWithData}
            maxCount={aggregate.maxCount}
            datasetLabel={datasetLabel}
            clientDealershipCount={clientOptions.length}
            competitorCount={competitorOptions.length}
            clientDealerships={clientOptions}
            radiusOptions={RADIUS_MILES_OPTIONS}
            onRadiusChange={handleRadiusChange}
            onToggleZipLayer={v => {
              setShowZipLayer(v);
              persistSettings({ showZipLayer: v });
            }}
            onToggleClientDealershipLayer={v => {
              setShowClientDealershipLayer(v);
              persistLayerVisibility(v, showCompetitorLayer);
            }}
            onToggleCompetitorLayer={v => {
              setShowCompetitorLayer(v);
              persistLayerVisibility(showClientDealershipLayer, v);
            }}
            onToggleRadiusLayer={v => {
              setShowRadiusLayer(v);
              persistSettings({ showRadiusLayer: v });
            }}
            marketAnalysis={marketAnalysis}
            hasFocusDealership={hasFocus}
            onMapReady={m => {
              mapInstanceRef.current = m;
            }}
          />
        </div>

        {view === 'dashboard' && (
          <div className="flex flex-1 min-h-0">
            <DashboardView
              model={dashboardModel}
              glow={accentColor}
              brandName={brand.name}
              datasetLabel={datasetLabel}
              focusName={focusDealership?.name ?? null}
              radiusMiles={radiusMiles}
            />
          </div>
        )}
      </div>
    </div>
  );
}
