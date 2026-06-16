'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { MapView } from '@/components/map/MapView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { PresentationHeader, type PresentationView } from './PresentationHeader';

interface Props {
  projectId: string;
  projectName: string;
  brandId: string;
  datasetLabel: string | null;
  rows: AudienceZipRow[];
  dealerships: DealershipRow[];
  initialSettings: ProjectMapSettings;
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

  // The presentation surface is dark, so the visible accent is the brand's
  // luminous `glow`; `--accent-strong` keeps the true brand hue for the
  // monogram / solid identity marks.
  const accentVars = {
    ['--accent']: brand.glow,
    ['--accent-strong']: brand.primaryColor,
    ['--accent-deep']: brand.glowDeep,
    ['--accent-dark']: brand.primaryColor,
    ['--accent-soft']: brand.glowSoft,
    ['--accent-line']: brand.glowLine,
    ['--on-accent']: brand.onPrimary,
  } as React.CSSProperties;

  return (
    <div className="mom-canvas flex flex-col h-screen" style={accentVars}>
      <PresentationHeader
        projectId={projectId}
        projectName={projectName}
        brandName={brand.name}
        view={view}
        onViewChange={setView}
        contextLabel={contextLabel}
      />

      <div className="flex flex-1 min-h-0">
        <div className={`flex-1 min-h-0 ${view === 'map' ? 'flex' : 'hidden'}`}>
          <MapView
            active={view === 'map'}
            rows={rows}
            selectedTypes={selectedTypes}
            primaryColor={brand.glow}
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
          />
        </div>

        {view === 'dashboard' && (
          <div className="flex flex-1 min-h-0">
            <DashboardView
              model={dashboardModel}
              glow={brand.glow}
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
