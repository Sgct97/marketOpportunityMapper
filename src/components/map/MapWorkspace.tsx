'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  aggregateAudienceByZip,
  listAudienceTypes,
} from '@/lib/audience/aggregate';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import { computeMarketAnalysis } from '@/lib/audience/market-analysis';
import { clientDealerships, filterDealerships, listDealershipBrands } from '@/lib/dealership/filter';
import type { DealershipRow } from '@/lib/dealership/types';
import { getBrand } from '@/lib/brands';
import { fetchZipBoundaries } from '@/lib/map/boundaries';
import { centroidsFromBoundaries } from '@/lib/map/centroids';
import type { LatLng } from '@/lib/map/centroids';
import {
  defaultMapSettings,
  parseProjectMapSettings,
  RADIUS_MILES_OPTIONS,
  type ProjectMapSettings,
  type RadiusMiles,
} from '@/lib/projects/settings';
import { saveProjectMapSettings } from '@/app/actions/project-settings';
import dynamic from 'next/dynamic';
import { MapSidebar } from './MapSidebar';

const OpportunityMap = dynamic(
  () => import('./OpportunityMap').then(m => ({ default: m.OpportunityMap })),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex-1 min-h-[400px] w-full bg-[#E8ECF0] flex items-center justify-center">
        <p className="text-sm text-[#718096]">Loading map…</p>
      </div>
    ),
  }
);

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

export function MapWorkspace({
  projectId,
  projectName,
  brandId,
  datasetLabel,
  rows,
  dealerships,
  initialSettings,
}: Props) {
  const brand = getBrand(brandId);
  const parsed = parseProjectMapSettings(initialSettings);
  const defaults = defaultMapSettings(resolveInitialFocus(dealerships, parsed));

  const audienceTypes = useMemo(() => listAudienceTypes(rows), [rows]);
  const allBrands = useMemo(() => listDealershipBrands(dealerships), [dealerships]);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => listAudienceTypes(rows));
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    allBrands.length > 0 ? allBrands : []
  );
  const [focusDealershipId, setFocusDealershipId] = useState<string | null>(
    () => defaults.focusDealershipId ?? null
  );
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(defaults.radiusMiles ?? 25);
  const [showZipLayer, setShowZipLayer] = useState(defaults.showZipLayer !== false);
  const [showDealershipLayer, setShowDealershipLayer] = useState(
    defaults.showDealershipLayer !== false
  );
  const [showRadiusLayer, setShowRadiusLayer] = useState(defaults.showRadiusLayer !== false);

  const visibleDealerships = useMemo(
    () =>
      selectedBrands.length > 0
        ? filterDealerships(dealerships, { brands: selectedBrands })
        : [],
    [dealerships, selectedBrands]
  );

  const clientOptions = useMemo(() => clientDealerships(dealerships), [dealerships]);

  const aggregate = useMemo(
    () => aggregateAudienceByZip(rows, selectedTypes),
    [rows, selectedTypes]
  );

  const typeLabel =
    selectedTypes.length === audienceTypes.length
      ? 'All selected segments'
      : selectedTypes.length === 1
        ? selectedTypes[0]!
        : `${selectedTypes.length} segments`;

  const zipCountWithData = aggregate.zips.filter(z => (aggregate.byZip[z] ?? 0) > 0).length;

  const zipsForAnalysis = useMemo(
    () => aggregate.zips.filter(zip => (aggregate.byZip[zip] ?? 0) > 0).sort(),
    [aggregate]
  );

  const [zipCentroids, setZipCentroids] = useState<Record<string, LatLng>>({});

  useEffect(() => {
    if (zipsForAnalysis.length === 0) return;

    const controller = new AbortController();
    fetchZipBoundaries(zipsForAnalysis, controller.signal)
      .then(fc => setZipCentroids(centroidsFromBoundaries(fc)))
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setZipCentroids({});
      });

    return () => controller.abort();
  }, [zipsForAnalysis]);

  const analysisCentroids = useMemo(
    () => (zipsForAnalysis.length === 0 ? {} : zipCentroids),
    [zipsForAnalysis.length, zipCentroids]
  );

  const focusDealership = useMemo(
    () => clientOptions.find(d => d.id === focusDealershipId) ?? null,
    [clientOptions, focusDealershipId]
  );

  const competitors = useMemo(
    () => visibleDealerships.filter(d => d.role === 'competitor'),
    [visibleDealerships]
  );

  const marketAnalysis = useMemo(() => {
    if (
      selectedTypes.length === 0 ||
      !focusDealership?.latitude ||
      !focusDealership?.longitude
    ) {
      return null;
    }

    return computeMarketAnalysis({
      byZip: aggregate.byZip,
      zipCentroids: analysisCentroids,
      focusLat: focusDealership.latitude,
      focusLng: focusDealership.longitude,
      radiusMiles,
      competitors,
    });
  }, [
    aggregate.byZip,
    analysisCentroids,
    focusDealership,
    radiusMiles,
    competitors,
    selectedTypes.length,
  ]);

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

  function toggleBrand(brandName: string) {
    setSelectedBrands(prev =>
      prev.includes(brandName) ? prev.filter(b => b !== brandName) : [...prev, brandName]
    );
  }

  function handleFocusDealership(id: string) {
    setFocusDealershipId(id);
    persistSettings({ focusDealershipId: id });
  }

  function handleRadiusChange(miles: RadiusMiles) {
    setRadiusMiles(miles);
    persistSettings({ radiusMiles: miles });
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAFBFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-[#4BA5A5] hover:underline shrink-0"
          >
            ← Setup
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[#1A202C] truncate">{projectName}</h1>
            <p className="text-xs text-[#718096]">Market opportunity map</p>
          </div>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 shrink-0"
          style={{ color: brand.primaryColor, backgroundColor: `${brand.primaryColor}14` }}
        >
          Presentation view
        </span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
        <OpportunityMap
          rows={rows}
          selectedTypes={selectedTypes}
          primaryColor={brand.primaryColor}
          typeLabel={typeLabel}
          dealerships={visibleDealerships}
          focusDealershipId={focusDealershipId}
          radiusMiles={radiusMiles}
          showZipLayer={showZipLayer}
          showDealershipLayer={showDealershipLayer}
          showRadiusLayer={showRadiusLayer}
          onFocusDealership={handleFocusDealership}
        />
        <MapSidebar
          audienceTypes={audienceTypes}
          selectedTypes={selectedTypes}
          onToggleType={toggleType}
          onSelectAll={() => setSelectedTypes([...audienceTypes])}
          onClearAll={() => setSelectedTypes([])}
          totalAudience={aggregate.totalAudience}
          zipCount={zipCountWithData}
          maxCount={aggregate.maxCount}
          primaryColor={brand.primaryColor}
          datasetLabel={datasetLabel}
          brands={allBrands}
          selectedBrands={selectedBrands}
          onToggleBrand={toggleBrand}
          onSelectAllBrands={() => setSelectedBrands([...allBrands])}
          onClearAllBrands={() => setSelectedBrands([])}
          clientDealerships={clientOptions}
          focusDealershipId={focusDealershipId}
          onFocusDealership={handleFocusDealership}
          radiusMiles={radiusMiles}
          radiusOptions={RADIUS_MILES_OPTIONS}
          onRadiusChange={handleRadiusChange}
          showZipLayer={showZipLayer}
          showDealershipLayer={showDealershipLayer}
          showRadiusLayer={showRadiusLayer}
          onToggleZipLayer={v => {
            setShowZipLayer(v);
            persistSettings({ showZipLayer: v });
          }}
          onToggleDealershipLayer={v => {
            setShowDealershipLayer(v);
            persistSettings({ showDealershipLayer: v });
          }}
          onToggleRadiusLayer={v => {
            setShowRadiusLayer(v);
            persistSettings({ showRadiusLayer: v });
          }}
          dealershipCount={visibleDealerships.length}
          marketAnalysis={marketAnalysis}
          hasFocusDealership={Boolean(focusDealership?.latitude && focusDealership?.longitude)}
          competitorCount={competitors.length}
        />
      </div>
    </div>
  );
}
