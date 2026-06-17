'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import type { MarketAnalysis } from '@/lib/audience/market-analysis';
import type { MapTheme } from '@/lib/map/basemap';
import type { DealershipRow } from '@/lib/dealership/types';
import type { RadiusMiles } from '@/lib/projects/settings';
import { MapSidebar } from './MapSidebar';

const OpportunityMap = dynamic(
  () => import('./OpportunityMap').then(m => ({ default: m.OpportunityMap })),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex-1 min-h-[400px] w-full bg-[var(--canvas)] flex items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading map…</p>
      </div>
    ),
  }
);

interface Props {
  active: boolean;
  theme: MapTheme;
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

  audienceTypes: string[];
  onToggleType: (type: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  totalAudience: number;
  zipCount: number;
  maxCount: number;
  datasetLabel: string | null;
  clientDealershipCount: number;
  competitorCount: number;
  clientDealerships: DealershipRow[];
  radiusOptions: readonly RadiusMiles[];
  onRadiusChange: (miles: RadiusMiles) => void;
  onToggleZipLayer: (visible: boolean) => void;
  onToggleClientDealershipLayer: (visible: boolean) => void;
  onToggleCompetitorLayer: (visible: boolean) => void;
  onToggleRadiusLayer: (visible: boolean) => void;
  marketAnalysis: MarketAnalysis | null;
  hasFocusDealership: boolean;
  onMapReady?: (map: MapLibreMap | null) => void;
}

function ControlsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h11M19 7h1M4 12h5M13 12h7M4 17h9M17 17h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17" cy="7" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="11" cy="12" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15" cy="17" r="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function MapView(props: Props) {
  const [controlsOpen, setControlsOpen] = useState(true);

  // The map fills the freed space when controls collapse; MapLibre tracks the
  // window resize event, so nudge it after the layout settles.
  const setControls = useCallback((open: boolean) => {
    setControlsOpen(open);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
  }, []);

  return (
    <div className="relative flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
      <OpportunityMap
        key={props.theme}
        theme={props.theme}
        active={props.active}
        rows={props.rows}
        selectedTypes={props.selectedTypes}
        primaryColor={props.primaryColor}
        typeLabel={props.typeLabel}
        dealerships={props.dealerships}
        focusDealershipId={props.focusDealershipId}
        radiusMiles={props.radiusMiles}
        showZipLayer={props.showZipLayer}
        showClientDealershipLayer={props.showClientDealershipLayer}
        showCompetitorLayer={props.showCompetitorLayer}
        showRadiusLayer={props.showRadiusLayer}
        onFocusDealership={props.onFocusDealership}
        onMapReady={props.onMapReady}
      />

      {!controlsOpen && (
        <button
          type="button"
          onClick={() => setControls(true)}
          className="mom-nav-btn absolute left-4 top-4 z-10 inline-flex items-center gap-2 shadow-lg"
          title="Show map controls"
        >
          <ControlsIcon />
          Controls
        </button>
      )}

      {controlsOpen && (
      <MapSidebar
        onCollapse={() => setControls(false)}
        audienceTypes={props.audienceTypes}
        selectedTypes={props.selectedTypes}
        onToggleType={props.onToggleType}
        onSelectAll={props.onSelectAll}
        onClearAll={props.onClearAll}
        totalAudience={props.totalAudience}
        zipCount={props.zipCount}
        maxCount={props.maxCount}
        primaryColor={props.primaryColor}
        datasetLabel={props.datasetLabel}
        clientDealershipCount={props.clientDealershipCount}
        competitorCount={props.competitorCount}
        clientDealerships={props.clientDealerships}
        focusDealershipId={props.focusDealershipId}
        onFocusDealership={props.onFocusDealership}
        radiusMiles={props.radiusMiles}
        radiusOptions={props.radiusOptions}
        onRadiusChange={props.onRadiusChange}
        showZipLayer={props.showZipLayer}
        showClientDealershipLayer={props.showClientDealershipLayer}
        showCompetitorLayer={props.showCompetitorLayer}
        showRadiusLayer={props.showRadiusLayer}
        onToggleZipLayer={props.onToggleZipLayer}
        onToggleClientDealershipLayer={props.onToggleClientDealershipLayer}
        onToggleCompetitorLayer={props.onToggleCompetitorLayer}
        onToggleRadiusLayer={props.onToggleRadiusLayer}
        marketAnalysis={props.marketAnalysis}
        hasFocusDealership={props.hasFocusDealership}
      />
      )}
    </div>
  );
}
