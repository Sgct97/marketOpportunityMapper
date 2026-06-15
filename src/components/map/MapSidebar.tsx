'use client';

import { legendStops } from '@/lib/audience/aggregate';
import type { MarketAnalysis } from '@/lib/audience/market-analysis';
import type { DealershipRow } from '@/lib/dealership/types';
import type { RadiusMiles } from '@/lib/projects/settings';
import { fillColor, hexToRgb } from '@/lib/map/colors';

interface Props {
  audienceTypes: string[];
  selectedTypes: string[];
  onToggleType: (type: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  totalAudience: number;
  zipCount: number;
  maxCount: number;
  primaryColor: string;
  datasetLabel?: string | null;
  clientDealershipCount: number;
  competitorCount: number;
  clientDealerships: DealershipRow[];
  focusDealershipId: string | null;
  onFocusDealership: (id: string) => void;
  radiusMiles: RadiusMiles;
  radiusOptions: readonly RadiusMiles[];
  onRadiusChange: (miles: RadiusMiles) => void;
  showZipLayer: boolean;
  showClientDealershipLayer: boolean;
  showCompetitorLayer: boolean;
  showRadiusLayer: boolean;
  onToggleZipLayer: (visible: boolean) => void;
  onToggleClientDealershipLayer: (visible: boolean) => void;
  onToggleCompetitorLayer: (visible: boolean) => void;
  onToggleRadiusLayer: (visible: boolean) => void;
  marketAnalysis: MarketAnalysis | null;
  hasFocusDealership: boolean;
}

export function MapSidebar({
  audienceTypes,
  selectedTypes,
  onToggleType,
  onSelectAll,
  onClearAll,
  totalAudience,
  zipCount,
  maxCount,
  primaryColor,
  datasetLabel,
  clientDealershipCount,
  competitorCount,
  clientDealerships,
  focusDealershipId,
  onFocusDealership,
  radiusMiles,
  radiusOptions,
  onRadiusChange,
  showZipLayer,
  showClientDealershipLayer,
  showCompetitorLayer,
  showRadiusLayer,
  onToggleZipLayer,
  onToggleClientDealershipLayer,
  onToggleCompetitorLayer,
  onToggleRadiusLayer,
  marketAnalysis,
  hasFocusDealership,
}: Props) {
  const rgb = hexToRgb(primaryColor);
  const stops = legendStops(maxCount);

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col max-h-[50vh] lg:max-h-none lg:h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-[#E2E8F0]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4BA5A5]">
          Map controls
        </h2>
        {datasetLabel && (
          <p className="text-xs text-[#718096] mt-1 truncate" title={datasetLabel}>
            Audience: {datasetLabel}
          </p>
        )}
      </div>

      <div className="px-5 py-4 border-b border-[#E2E8F0] space-y-3">
        <p className="text-xs font-medium text-[#718096] uppercase tracking-wide">Layers</p>
        <label className="flex items-center gap-2 text-xs text-[#2D3748] cursor-pointer">
          <input
            type="checkbox"
            checked={showZipLayer}
            onChange={e => onToggleZipLayer(e.target.checked)}
            className="accent-[#4BA5A5]"
          />
          ZIP audience heatmap
        </label>
        <label className="flex items-center gap-2 text-xs text-[#2D3748] cursor-pointer">
          <input
            type="checkbox"
            checked={showClientDealershipLayer}
            onChange={e => onToggleClientDealershipLayer(e.target.checked)}
            disabled={clientDealershipCount === 0}
            className="accent-[#4BA5A5] disabled:opacity-40"
          />
          Client dealership{clientDealershipCount === 1 ? '' : 's'} (
          {clientDealershipCount.toLocaleString('en-US')})
        </label>
        <label className="flex items-center gap-2 text-xs text-[#2D3748] cursor-pointer">
          <input
            type="checkbox"
            checked={showCompetitorLayer}
            onChange={e => onToggleCompetitorLayer(e.target.checked)}
            disabled={competitorCount === 0}
            className="accent-[#4BA5A5] disabled:opacity-40"
          />
          Competitors ({competitorCount.toLocaleString('en-US')})
        </label>
        <label className="flex items-center gap-2 text-xs text-[#2D3748] cursor-pointer">
          <input
            type="checkbox"
            checked={showRadiusLayer}
            onChange={e => onToggleRadiusLayer(e.target.checked)}
            disabled={!focusDealershipId}
            className="accent-[#4BA5A5] disabled:opacity-40"
          />
          Radius ring
        </label>
      </div>

      {clientDealerships.length > 0 && (
        <div className="px-5 py-4 border-b border-[#E2E8F0] space-y-2">
          <label className="block text-sm font-medium text-[#2D3748]">
            Focus client dealership
          </label>
          <select
            value={focusDealershipId ?? ''}
            onChange={e => onFocusDealership(e.target.value)}
            className="w-full border border-[#E2E8F0] px-2 py-2 text-xs text-[#2D3748] bg-white focus:outline-none focus:border-[#4BA5A5]"
          >
            {clientDealerships.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[#718096]">
            Radius rings center on this location (approximate miles, not drive-time).
          </p>
          <div className="flex gap-2 pt-1">
            {radiusOptions.map(miles => (
              <button
                key={miles}
                type="button"
                onClick={() => onRadiusChange(miles)}
                className={`flex-1 py-1.5 text-xs border transition-colors ${
                  radiusMiles === miles
                    ? 'border-[#4BA5A5] bg-[#4BA5A5]/10 text-[#2D3748] font-medium'
                    : 'border-[#E2E8F0] text-[#718096] hover:border-[#CBD5E0]'
                }`}
              >
                {miles} mi
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-b border-[#E2E8F0] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#2D3748]">Audience segments</span>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={onSelectAll} className="text-[#4BA5A5] hover:underline">
              All
            </button>
            <button type="button" onClick={onClearAll} className="text-[#718096] hover:underline">
              None
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
          {audienceTypes.map(type => (
            <label
              key={type}
              className="flex items-start gap-2 text-xs text-[#2D3748] cursor-pointer py-1"
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => onToggleType(type)}
                className="mt-0.5 accent-[#4BA5A5]"
              />
              <span className="leading-snug">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-b border-[#E2E8F0]">
        <p className="text-xs font-medium text-[#718096] uppercase tracking-wide mb-2">Summary</p>
        <dl className="space-y-1 text-sm text-[#2D3748]">
          <div className="flex justify-between">
            <dt className="text-[#718096]">Total audience</dt>
            <dd className="font-medium tabular-nums">{totalAudience.toLocaleString('en-US')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#718096]">ZIPs on map</dt>
            <dd className="font-medium tabular-nums">{zipCount.toLocaleString('en-US')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#718096]">Segments</dt>
            <dd className="font-medium tabular-nums">{selectedTypes.length}</dd>
          </div>
        </dl>
      </div>

      {hasFocusDealership && marketAnalysis && selectedTypes.length > 0 && (
        <div className="px-5 py-4 border-b border-[#E2E8F0] space-y-3">
          <p className="text-xs font-medium text-[#718096] uppercase tracking-wide">
            Market opportunity
          </p>

          <div className="rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[#718096]">
              Audience within {radiusMiles} mi
            </p>
            <p className="text-lg font-semibold tabular-nums text-[#1A202C] mt-0.5">
              {marketAnalysis.audienceInRadius.toLocaleString('en-US')}
            </p>
            <p className="text-[10px] text-[#718096] mt-1">
              {marketAnalysis.zipsInRadius} ZIP{marketAnalysis.zipsInRadius === 1 ? '' : 's'} ·
              ZIP-centroid estimate (not drive-time)
            </p>
          </div>

          {marketAnalysis.topZips.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#718096] mb-1.5">
                Top ZIPs
              </p>
              <ul className="space-y-1">
                {marketAnalysis.topZips.map((z, i) => (
                  <li
                    key={z.zip}
                    className="flex justify-between text-xs text-[#2D3748] tabular-nums"
                  >
                    <span className="text-[#718096]">
                      {i + 1}. {z.zip}
                    </span>
                    <span className="font-medium">{z.count.toLocaleString('en-US')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {marketAnalysis.whiteSpace.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#718096] mb-1.5">
                White space
              </p>
              <p className="text-[10px] text-[#718096] mb-1.5">
                High-audience ZIPs with no competitor within {radiusMiles} mi
              </p>
              <ul className="space-y-1">
                {marketAnalysis.whiteSpace.map(z => (
                  <li
                    key={z.zip}
                    className="flex justify-between text-xs text-[#2D3748] tabular-nums"
                  >
                    <span style={{ color: primaryColor }}>{z.zip}</span>
                    <span className="font-medium">{z.count.toLocaleString('en-US')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {marketAnalysis.whiteSpace.length === 0 && competitorCount === 0 && (
            <p className="text-[10px] text-[#718096]">
              Upload competitor dealerships to identify white-space ZIPs.
            </p>
          )}
        </div>
      )}

      {!hasFocusDealership && selectedTypes.length > 0 && (
        <div className="px-5 py-3 border-b border-[#E2E8F0] text-[10px] text-[#718096]">
          Upload a client dealership with coordinates to see radius audience and white-space
          analysis.
        </div>
      )}

      <div className="px-5 py-4">
        <p className="text-xs font-medium text-[#718096] uppercase tracking-wide mb-3">
          Audience intensity
        </p>
        <div
          className="h-2 w-full border border-[#E2E8F0] mb-2"
          style={{
            background: `linear-gradient(90deg, ${fillColor(rgb, 0)} 0%, ${fillColor(rgb, 0.5)} 50%, ${fillColor(rgb, 1)} 100%)`,
          }}
          aria-hidden
        />
        <div className="flex justify-between text-[10px] text-[#718096] tabular-nums">
          <span>{stops[0]?.label ?? '0'}</span>
          <span>{stops[stops.length - 1]?.label ?? '—'}</span>
        </div>
        <div className="mt-4 flex gap-3 text-[10px] text-[#718096]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: primaryColor }} />
            Client
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] border-2 border-white shadow-sm" />
            Competitor
          </span>
        </div>
      </div>
    </aside>
  );
}
