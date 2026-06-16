'use client';

import dynamic from 'next/dynamic';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import type { MarketAnalysis } from '@/lib/audience/market-analysis';
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
}

export function MapView(props: Props) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
      <OpportunityMap
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
      />
      <MapSidebar
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
    </div>
  );
}
