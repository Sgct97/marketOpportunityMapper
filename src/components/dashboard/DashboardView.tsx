import type { DashboardModel } from '@/lib/audience/dashboard';
import { TOP_SEGMENT_DISPLAY_COUNT, TOP_ZIP_DISPLAY_COUNT } from '@/lib/audience/presentation-limits';
import type { ReachScopeCopy } from '@/lib/audience/presentation-scope';
import { formatZipDisplay } from '@/lib/map/zip-labels';
import type { ZipLabel } from '@/lib/map/zip-labels';
import { formatCompact, formatNumber, formatPercent, EMPTY_VALUE } from '@/lib/format';
import {
  BarRow,
  Donut,
  IconLayers,
  IconTarget,
  KpiCard,
  SectionCard,
} from './primitives';

interface Props {
  model: DashboardModel;
  zipLabels: Record<string, ZipLabel>;
  /** Luminous on-dark brand accent (hex). */
  glow: string;
  brandName: string;
  datasetLabel: string | null;
  focusName: string | null;
  radiusMiles: number;
  reachScope: ReachScopeCopy;
  excludedZipCount: number;
  /** When false, hide Audience composition donuts (also omitted from PDF). */
  showComposition: boolean;
  onShowCompositionChange: (show: boolean) => void;
  /** Live map canvas snapshot — mirrors the Map tab's current pan/zoom. */
  mapPreviewUrl?: string | null;
  onOpenMap?: () => void;
}

function CompositionSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <span className="text-[12px] text-[var(--muted)]">Composition</span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          aria-label="Show audience composition charts"
        />
        <span className="absolute inset-0 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)]" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function DashboardView({
  model,
  zipLabels,
  glow,
  brandName,
  datasetLabel,
  focusName,
  radiusMiles,
  reachScope,
  excludedZipCount,
  showComposition,
  onShowCompositionChange,
  mapPreviewUrl = null,
  onOpenMap,
}: Props) {
  const {
    totalAudience,
    totalZips,
    segmentCount,
    segments,
    topSegment,
    composition,
    concentration,
    tradeArea,
  } = model;

  const useTradeArea = Boolean(
    tradeArea && tradeArea.centroidsResolved && tradeArea.zipsInRadius > 0
  );
  const topZips = useTradeArea ? tradeArea!.topZips : concentration.topZips;
  const topZipsScopeLabel = useTradeArea ? `Within ${radiusMiles} mi` : 'Across market';
  const topZipMax = topZips[0]?.count ?? 1;
  const subjectName = focusName || brandName;
  const compositionFacets = composition.slice(0, 2);
  const hasComposition = compositionFacets.length > 0;
  const noSegmentsSelected = reachScope.segmentPhrase === 'No segments selected';

  // Hero leads with total reach for the active presentation scope (map filters).
  const heroReach = useTradeArea ? tradeArea!.audienceInRadius : totalAudience;
  const heroZips = useTradeArea ? tradeArea!.zipsInRadius : totalZips;
  const leadSegment = (useTradeArea ? tradeArea!.leadSegment : null) ?? topSegment;
  const activeSegments = (useTradeArea ? tradeArea!.segments : segments).slice(
    0,
    TOP_SEGMENT_DISPLAY_COUNT
  );
  const totalSegmentCount = useTradeArea ? tradeArea!.segments.length : segmentCount;
  const activeAudience = heroReach;
  const maxSegmentTotal = activeSegments[0]?.total ?? 1;
  const conc = useTradeArea
    ? { top5Share: tradeArea!.top5Share, zipsForHalf: tradeArea!.zipsForHalf }
    : { top5Share: concentration.top5Share, zipsForHalf: concentration.zipsForHalf };

  return (
    <div className="mom-scroll flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1340px] px-6 sm:px-8 lg:px-10 py-7 sm:py-9">
        {noSegmentsSelected ? (
          <section className="mom-card mom-card-lg p-8 text-center">
            <p className="text-[15px] font-semibold text-[var(--ink)]">No segments selected</p>
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              Choose at least one audience segment in the map controls to populate the dashboard.
            </p>
          </section>
        ) : (
        <>
        {/* Hero — copy left; live map snapshot (current pan/zoom) on the right. */}
        <section className="mom-card mom-card-lg mom-fade-up relative overflow-hidden">
          {!mapPreviewUrl && (
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
              style={{ background: 'var(--accent-soft)' }}
              aria-hidden
            />
          )}
          <div
            className={`relative grid ${mapPreviewUrl ? 'lg:grid-cols-2' : ''}`}
          >
            <div className="p-7 sm:p-9 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
                <p className="mom-eyebrow">Market opportunity · {subjectName}</p>
              </div>
              <div className="mt-4 flex items-end gap-3">
                <span className="mom-display-accent text-[56px] sm:text-[68px] font-semibold leading-[0.9] tnum">
                  {formatCompact(heroReach)}
                </span>
              </div>
              <p className="mt-2 text-[15px] sm:text-[16px] font-semibold leading-snug text-[var(--ink)]">
                {reachScope.headline}
              </p>
              <p className="mt-1 text-[13px] text-[var(--faint)]">
                {reachScope.segmentPhrase} · {formatNumber(heroZips)} ZIPs · overlapping
                {useTradeArea ? ` · within ${radiusMiles} mi of ${subjectName}` : ' · across the market'}
                {excludedZipCount > 0 ? ` · ${formatNumber(excludedZipCount)} ZIP${excludedZipCount === 1 ? '' : 's'} excluded` : ''}
              </p>

              {leadSegment && (
                <div className="mt-5 pt-5 border-t border-[var(--line-soft)]">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="mom-display text-[38px] sm:text-[44px] font-semibold leading-none tnum text-[var(--ink)]">
                      {formatCompact(leadSegment.total)}
                    </span>
                    <span className="text-[14px] sm:text-[15px] font-bold tnum" style={{ color: 'var(--accent)' }}>
                      {formatPercent(leadSegment.share)} of reach
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] sm:text-[15px] font-semibold leading-snug text-[var(--ink)]">
                    {leadSegment.name}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--faint)]">
                    Largest single audience{useTradeArea ? ' in the trade area' : ''}. A true headcount, not a sum.
                  </p>
                </div>
              )}

              <p className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] leading-snug"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--ink-2)' }}>
                <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatPercent(conc.top5Share)}
                </span>
                concentrated in the top 5 ZIPs · {formatNumber(conc.zipsForHalf)} ZIPs make up half the reach.
              </p>
            </div>

            {mapPreviewUrl && (
              <button
                type="button"
                onClick={onOpenMap}
                className="relative min-h-[220px] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-[var(--line-soft)] text-left group cursor-pointer"
                style={{ background: 'var(--map-backdrop)' }}
                aria-label="Open map view"
              >
                {/* `contain`, not `cover`: cover scales the snapshot up and
                    crops it, which reads as a different zoom than the map. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mapPreviewUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <span
                  className="absolute bottom-3 right-3 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase opacity-90 transition-opacity group-hover:opacity-100"
                  style={{
                    background: 'var(--chip-bg)',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                  }}
                >
                  Open map
                </span>
              </button>
            )}
          </div>
        </section>

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {useTradeArea ? (
            <KpiCard
              label="ZIPs in trade area"
              value={formatNumber(heroZips)}
              icon={<IconTarget />}
              sub={`within ${radiusMiles} mi of ${subjectName}`}
              delay={40}
            />
          ) : (
            <KpiCard
              label="Lead segment share"
              value={topSegment ? formatPercent(topSegment.share) : EMPTY_VALUE}
              icon={<IconTarget />}
              sub={topSegment?.name ?? 'No segments'}
              delay={40}
            />
          )}
          <KpiCard
            label="Market concentration"
            value={formatPercent(conc.top5Share)}
            icon={<IconLayers />}
            sub={`from the top 5 ZIPs · ${formatNumber(conc.zipsForHalf)} ZIPs make up half`}
            delay={100}
          />
        </div>

        {/* Composition */}
        {hasComposition && (
          <div className="mt-5">
            {showComposition ? (
              <SectionCard
                eyebrow="Grouped from segment names"
                title="Audience composition"
                right={
                  <CompositionSwitch
                    checked={showComposition}
                    onChange={onShowCompositionChange}
                  />
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-10">
                  {compositionFacets.map(facet => (
                    <Donut
                      key={facet.id}
                      title={facet.buckets[0]?.label ?? ''}
                      buckets={facet.buckets}
                      accent={glow}
                    />
                  ))}
                </div>
              </SectionCard>
            ) : (
              <div className="mom-card flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="mom-eyebrow">Grouped from segment names</p>
                  <p className="mt-0.5 text-[13px] text-[var(--muted)]">Audience composition hidden</p>
                </div>
                <CompositionSwitch
                  checked={showComposition}
                  onChange={onShowCompositionChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Main grid */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Segment breakdown */}
          <div className="lg:col-span-7">
            <SectionCard
              eyebrow={
                useTradeArea
                  ? `Trade area · top ${TOP_SEGMENT_DISPLAY_COUNT} of ${totalSegmentCount} segments`
                  : `Current scope · top ${TOP_SEGMENT_DISPLAY_COUNT} of ${totalSegmentCount} segments`
              }
              title="Audience segment breakdown"
              right={
                <div>
                  <p className="mom-stat text-[20px] font-semibold">{formatNumber(activeAudience)}</p>
                  <p className="text-[11px] text-[var(--faint)]">
                    {useTradeArea ? 'trade-area reach' : 'total audience'}
                  </p>
                </div>
              }
            >
              <div className="divide-y divide-[var(--line-soft)]">
                {activeSegments.map((seg, i) => (
                  <BarRow
                    key={seg.name}
                    rank={i + 1}
                    name={seg.name}
                    value={formatNumber(seg.total)}
                    share={seg.share}
                    ratio={seg.total / maxSegmentTotal}
                  />
                ))}
                {activeSegments.length === 0 && (
                  <p className="py-3 text-[13px] text-[var(--muted)]">No segments in the current scope.</p>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            <SectionCard
              eyebrow={topZipsScopeLabel}
              title={`Top ${TOP_ZIP_DISPLAY_COUNT} ZIP codes`}
              right={
                <p className="text-[12px] text-[var(--muted)]">
                  {formatNumber(Math.min(topZips.length, TOP_ZIP_DISPLAY_COUNT))} shown
                </p>
              }
            >
              <div className="divide-y divide-[var(--line-soft)]">
                {topZips.map((z, i) => (
                  <BarRow
                    key={z.zip}
                    rank={i + 1}
                    name={formatZipDisplay(z.zip, zipLabels)}
                    value={formatNumber(z.count)}
                    share={z.share}
                    ratio={z.count / topZipMax}
                  />
                ))}
                {topZips.length === 0 && (
                  <p className="py-3 text-[13px] text-[var(--muted)]">No ZIP data available.</p>
                )}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Methodology */}
        <p className="mt-7 text-[11px] leading-relaxed text-[var(--faint)] max-w-3xl">
          {datasetLabel ? `Source: ${datasetLabel}. ` : ''}
          Figures match the current map scope: {reachScope.segmentPhrase.toLowerCase()}
          {excludedZipCount > 0 ? `, ${excludedZipCount} excluded ZIP${excludedZipCount === 1 ? '' : 's'}` : ''}
          {useTradeArea ? `, within ${radiusMiles} mi of ${subjectName}` : ''}.
          {' '}
          “Reach” is the sum of segment counts; the same person can belong to more than one
          segment, so reach reflects total addressable touchpoints, not unique individuals.
          Distance uses straight-line miles from the client pin to ZIP centroids (not drive-time).
        </p>
        </>
        )}
      </div>
    </div>
  );
}
