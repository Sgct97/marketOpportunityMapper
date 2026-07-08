'use client';

import { legendStops } from '@/lib/audience/aggregate';
import type { MarketAnalysis } from '@/lib/audience/market-analysis';
import type { DealershipRow } from '@/lib/dealership/types';
import type { AccentSource, RadiusMiles } from '@/lib/projects/settings';
import { fillColor, hexToRgb } from '@/lib/map/colors';
import { formatNumber, formatPercent, EMPTY_VALUE } from '@/lib/format';

interface Props {
  audienceTypes: string[];
  selectedTypes: string[];
  onToggleType: (type: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  totalAudience: number;
  zipCount: number;
  excludedZipCount: number;
  onRestoreAllZips: () => void;
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
  accentSource: AccentSource;
  onAccentSourceChange: (source: AccentSource) => void;
  vehicleBrandName: string;
  agencyBrandName: string;
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
  onCollapse?: () => void;
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 6l6 6-6 6M5 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 py-1.5 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span className="text-[13px] leading-snug text-[var(--ink-2)]">{label}</span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)]" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function MapSidebar({
  audienceTypes,
  selectedTypes,
  onToggleType,
  onSelectAll,
  onClearAll,
  totalAudience,
  zipCount,
  excludedZipCount,
  onRestoreAllZips,
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
  accentSource,
  onAccentSourceChange,
  vehicleBrandName,
  agencyBrandName,
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
  onCollapse,
}: Props) {
  const rgb = hexToRgb(primaryColor);
  const stops = legendStops(maxCount);
  const scoped = marketAnalysis?.topZipsScope === 'trade-area';

  return (
    <aside className="mom-panel mom-scroll w-full lg:w-[372px] shrink-0 border-l border-[var(--line)] flex flex-col max-h-[52vh] lg:max-h-none lg:h-full overflow-y-auto">
      <div className="px-6 pt-5 pb-4 border-b border-[var(--line-soft)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="mom-eyebrow">Map controls</h2>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="mom-icon-btn -mt-1.5 -mr-1.5 h-8 w-8"
              title="Collapse controls"
              aria-label="Collapse controls"
            >
              <CollapseIcon />
            </button>
          )}
        </div>
        {datasetLabel && (
          <p className="mt-1.5 text-[12px] text-[var(--muted)] truncate" title={datasetLabel}>
            {datasetLabel}
          </p>
        )}
      </div>

      <div className="px-6 py-4 border-b border-[var(--line-soft)]">
        <p className="mom-eyebrow mb-2.5">Brand palette</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'vehicle', label: vehicleBrandName, sub: 'Vehicle brand' },
            { id: 'agency', label: agencyBrandName, sub: 'Agency brand' },
          ] as const).map(opt => {
            const active = accentSource === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAccentSourceChange(opt.id)}
                data-active={active}
                className="rounded-lg border px-3 py-2.5 text-left transition-colors data-[active=true]:border-[var(--accent)] data-[active=true]:bg-[var(--accent-soft)] border-[var(--line)] hover:border-[var(--faint)]"
              >
                <span className="block text-[10px] uppercase tracking-wide text-[var(--faint)]">
                  {opt.sub}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: active ? 'var(--accent)' : 'var(--faint)' }}
                  />
                  <span className="truncate" title={opt.label}>
                    {opt.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[var(--faint)]">
          Recolors the map, dashboard, and exported report.
        </p>
      </div>

      <div className="px-6 py-4 border-b border-[var(--line-soft)]">
        <p className="mom-eyebrow mb-1.5">Layers</p>
        <Switch label="ZIP audience heatmap" checked={showZipLayer} onChange={onToggleZipLayer} />
        <Switch
          label={`Client dealership${clientDealershipCount === 1 ? '' : 's'} (${formatNumber(
            clientDealershipCount
          )})`}
          checked={showClientDealershipLayer}
          disabled={clientDealershipCount === 0}
          onChange={onToggleClientDealershipLayer}
        />
        <Switch
          label={`Competitors (${formatNumber(competitorCount)})`}
          checked={showCompetitorLayer}
          disabled={competitorCount === 0}
          onChange={onToggleCompetitorLayer}
        />
        <Switch
          label="Radius ring"
          checked={showRadiusLayer}
          disabled={!focusDealershipId}
          onChange={onToggleRadiusLayer}
        />
      </div>

      {clientDealerships.length > 0 && (
        <div className="px-6 py-4 border-b border-[var(--line-soft)] space-y-2.5">
          <label className="block text-[13px] font-semibold text-[var(--ink)]">
            Focus dealership
          </label>
          <select
            value={focusDealershipId ?? ''}
            onChange={e => onFocusDealership(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          >
            {clientDealerships.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-0.5">
            {radiusOptions.map(miles => (
              <button
                key={miles}
                type="button"
                onClick={() => onRadiusChange(miles)}
                data-active={radiusMiles === miles}
                className="flex-1 rounded-lg border py-2 text-[13px] font-semibold transition-colors data-[active=true]:border-[var(--accent)] data-[active=true]:bg-[var(--accent-soft)] data-[active=true]:text-[var(--ink)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--faint)]"
              >
                {miles} mi
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--faint)]">
            Straight-line radius from the client pin (not drive-time).
          </p>
        </div>
      )}

      <div className="px-6 py-4 border-b border-[var(--line-soft)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--ink)]">Audience segments</span>
          <div className="flex gap-3 text-[12px] font-medium">
            <button type="button" onClick={onSelectAll} className="text-[var(--accent)] hover:underline">
              All
            </button>
            <button type="button" onClick={onClearAll} className="text-[var(--muted)] hover:underline">
              None
            </button>
          </div>
        </div>
        <p className="text-[11px] text-[var(--faint)] -mt-1">
          Filters the map. The dashboard always shows every segment.
        </p>
        <div className="mom-scroll max-h-44 overflow-y-auto space-y-0.5 pr-1">
          {audienceTypes.map(type => {
            const checked = selectedTypes.includes(type);
            return (
              <label
                key={type}
                className="flex items-start gap-2.5 rounded-md px-1 py-1.5 text-[12.5px] leading-snug text-[var(--ink-2)] cursor-pointer hover:bg-[var(--surface-2)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleType(type)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[var(--accent)]"
                />
                <span>{type}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-4 border-b border-[var(--line-soft)] space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[var(--ink)]">ZIP curation</p>
          {excludedZipCount > 0 && (
            <button
              type="button"
              onClick={onRestoreAllZips}
              className="text-[12px] font-medium text-[var(--accent)] hover:underline shrink-0"
            >
              Restore all
            </button>
          )}
        </div>
        <p className="text-[11px] text-[var(--faint)] leading-snug">
          Click a ZIP on the map to include or exclude it from every metric, dashboard total, and
          export.
        </p>
        {excludedZipCount > 0 && (
          <p className="text-[12px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)] tnum">
              {formatNumber(excludedZipCount)}
            </span>{' '}
            ZIP{excludedZipCount === 1 ? '' : 's'} excluded
          </p>
        )}
      </div>

      <div className="px-6 py-4 border-b border-[var(--line-soft)]">
        <p className="mom-eyebrow mb-2.5">Selected on map</p>
        <dl className="grid grid-cols-2 gap-3">
          <Metric label="Audience" value={formatNumber(totalAudience)} />
          <Metric label="ZIPs" value={formatNumber(zipCount)} />
          <Metric label="Segments" value={`${selectedTypes.length}/${audienceTypes.length}`} />
          <Metric label="Peak ZIP" value={formatNumber(maxCount)} />
        </dl>
      </div>

      {hasFocusDealership && marketAnalysis && selectedTypes.length > 0 && (
        <div className="px-6 py-4 border-b border-[var(--line-soft)] space-y-3.5">
          <p className="mom-eyebrow">Trade area · {radiusMiles} mi</p>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--faint)]">
              Audience within {radiusMiles} mi
            </p>
            <p className="mom-stat text-[26px] font-semibold mt-1">
              {formatNumber(marketAnalysis.audienceInRadius)}
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-1.5">
              {formatNumber(marketAnalysis.zipsInRadius)} ZIP
              {marketAnalysis.zipsInRadius === 1 ? '' : 's'}
              {marketAnalysis.marketTotal > 0 && (
                <> · {formatPercent(marketAnalysis.radiusShare)} of total market</>
              )}
            </p>
          </div>

          {marketAnalysis.topZips.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--faint)] mb-2">
                Top ZIPs {scoped ? 'in trade area' : 'in market'}
              </p>
              <ul className="space-y-1.5">
                {marketAnalysis.topZips.map((z, i) => (
                  <li key={z.zip} className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--muted)] tnum">
                      <span className="inline-block w-5 text-[var(--faint)]">{i + 1}</span>
                      {z.zip}
                    </span>
                    <span className="font-semibold text-[var(--ink)] tnum">
                      {formatNumber(z.count)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {marketAnalysis.whiteSpace.length > 0 && (
            <div className="rounded-xl border border-[var(--line)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--faint)]">
                White space
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5 mb-2">
                High audience, no competitor within {radiusMiles} mi
              </p>
              <ul className="space-y-1.5">
                {marketAnalysis.whiteSpace.map(z => (
                  <li key={z.zip} className="flex items-center justify-between text-[13px]">
                    <span className="font-medium tnum" style={{ color: 'var(--accent)' }}>
                      {z.zip}
                    </span>
                    <span className="font-semibold text-[var(--ink)] tnum">
                      {formatNumber(z.count)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {marketAnalysis.whiteSpace.length === 0 && competitorCount === 0 && (
            <p className="text-[11px] text-[var(--muted)]">
              Add competitor dealerships to surface white-space ZIPs.
            </p>
          )}
        </div>
      )}

      {!hasFocusDealership && selectedTypes.length > 0 && (
        <div className="px-6 py-3.5 border-b border-[var(--line-soft)] text-[11px] text-[var(--muted)]">
          Confirm a client dealership to unlock radius and white-space analysis.
        </div>
      )}

      <div className="px-6 py-5 mt-auto">
        <p className="mom-eyebrow mb-3">Audience intensity</p>
        <div
          className="h-2.5 w-full rounded-full border border-[var(--line)]"
          style={{
            background: `linear-gradient(90deg, ${fillColor(rgb, 0.08)} 0%, ${fillColor(
              rgb,
              0.5
            )} 50%, ${fillColor(rgb, 1)} 100%)`,
          }}
          aria-hidden
        />
        <div className="mt-1.5 flex justify-between text-[11px] text-[var(--faint)] tnum">
          <span>{stops[0]?.label ?? '0'}</span>
          <span>{stops[stops.length - 1]?.label ?? EMPTY_VALUE}</span>
        </div>
        <div className="mt-4 flex gap-4 text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: 'var(--accent)' }}
            />
            Client
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9FB1C9] border border-[rgba(7,11,21,0.9)] shadow-sm" />
            Competitor
          </span>
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--faint)]">{label}</dt>
      <dd className="mom-stat text-[19px] font-semibold mt-0.5">{value}</dd>
    </div>
  );
}
