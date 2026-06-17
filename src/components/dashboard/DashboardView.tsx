import type { DashboardModel } from '@/lib/audience/dashboard';
import { formatCompact, formatNumber, formatPercent, EMPTY_VALUE } from '@/lib/format';
import {
  BarRow,
  Chip,
  Donut,
  IconFlag,
  IconLayers,
  IconTarget,
  IconUsers,
  KpiCard,
  SectionCard,
} from './primitives';

interface Props {
  model: DashboardModel;
  /** Luminous on-dark brand accent (hex). */
  glow: string;
  brandName: string;
  datasetLabel: string | null;
  focusName: string | null;
  radiusMiles: number;
}

export function DashboardView({
  model,
  glow,
  brandName,
  datasetLabel,
  focusName,
  radiusMiles,
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
    competitive,
  } = model;

  const useTradeArea = Boolean(
    tradeArea && tradeArea.centroidsResolved && tradeArea.zipsInRadius > 0
  );
  const topZips = useTradeArea ? tradeArea!.topZips : concentration.topZips;
  const topZipsScopeLabel = useTradeArea ? `Within ${radiusMiles} mi` : 'Across market';
  const maxSegmentTotal = topSegment?.total ?? 1;
  const topZipMax = topZips[0]?.count ?? 1;
  const subjectName = focusName || brandName;
  const compositionFacets = composition.slice(0, 2);
  const hasComposition = compositionFacets.length > 0;

  // Hero leads with the LARGEST SINGLE SEGMENT — a real, non-overlapping
  // headcount we can defend to a client. The summed multi-segment "reach"
  // (which double-counts people across segments) is demoted to a supporting
  // line and a KPI, never the headline. Concentration tells the geographic story.
  const heroReach = useTradeArea ? tradeArea!.audienceInRadius : totalAudience;
  const heroZips = useTradeArea ? tradeArea!.zipsInRadius : totalZips;
  const heroScope = useTradeArea ? `within ${subjectName}'s ${radiusMiles}-mi trade area` : 'across the market';
  const leadSegment = (useTradeArea ? tradeArea!.leadSegment : null) ?? topSegment;
  const conc = useTradeArea
    ? { top5Share: tradeArea!.top5Share, zipsForHalf: tradeArea!.zipsForHalf }
    : { top5Share: concentration.top5Share, zipsForHalf: concentration.zipsForHalf };

  return (
    <div className="mom-scroll flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1340px] px-6 sm:px-8 lg:px-10 py-7 sm:py-9">
        {/* Hero */}
        <section className="mom-card mom-card-lg mom-fade-up relative overflow-hidden p-7 sm:p-9">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
            style={{ background: 'var(--accent-soft)' }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
                <p className="mom-eyebrow">Market opportunity · {subjectName}</p>
              </div>
              <div className="mt-4 flex items-end gap-3">
                <span className="mom-display-accent text-[56px] sm:text-[68px] font-semibold leading-[0.9] tnum">
                  {leadSegment ? formatCompact(leadSegment.total) : EMPTY_VALUE}
                </span>
                {leadSegment && (
                  <span className="mb-2 text-[15px] font-bold tnum" style={{ color: 'var(--accent)' }}>
                    {formatPercent(leadSegment.share)} of reach
                  </span>
                )}
              </div>
              <p className="mt-2 text-[15px] sm:text-[16px] font-semibold leading-snug text-[var(--ink)]">
                {leadSegment ? leadSegment.name : 'No segments in file'}
              </p>
              <p className="mt-1 text-[13px] text-[var(--faint)]">
                Largest single audience{useTradeArea ? ' in the trade area' : ''}. A true headcount, not a sum.
              </p>
              <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-[var(--ink-2)]">
                Part of <span className="tnum font-semibold text-[var(--ink)]">{formatNumber(heroReach)}</span> in
                total reach across {segmentCount} segments {heroScope}, spanning{' '}
                <span className="tnum font-semibold text-[var(--ink)]">{formatNumber(heroZips)}</span> ZIP codes.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] leading-snug"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--ink-2)' }}>
                <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatPercent(conc.top5Share)}
                </span>
                concentrated in the top 5 ZIPs · {formatNumber(conc.zipsForHalf)} ZIPs make up half the reach.
              </p>
            </div>
            <div className="shrink-0 lg:text-right">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-line)',
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
                {brandName}
              </span>
            </div>
          </div>
        </section>

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          <KpiCard
            label="Total reach (all segments)"
            value={formatCompact(heroReach)}
            accent={useTradeArea ? formatPercent(tradeArea!.share) : null}
            icon={<IconUsers />}
            sub={`${segmentCount} segments · ${formatNumber(heroZips)} ZIPs · overlapping`}
            delay={40}
          />
          {useTradeArea ? (
            <KpiCard
              label="Full-market reach"
              value={formatCompact(totalAudience)}
              icon={<IconTarget />}
              sub={`${formatNumber(totalZips)} ZIPs across the market`}
              delay={100}
            />
          ) : (
            <KpiCard
              label="Lead segment share"
              value={topSegment ? formatPercent(topSegment.share) : EMPTY_VALUE}
              icon={<IconTarget />}
              sub={topSegment?.name ?? 'No segments'}
              delay={100}
            />
          )}
          <KpiCard
            label="Market concentration"
            value={formatPercent(conc.top5Share)}
            icon={<IconLayers />}
            sub={`from the top 5 ZIPs · ${formatNumber(conc.zipsForHalf)} ZIPs make up half`}
            delay={160}
          />
          {competitive.competitorCount > 0 ? (
            <KpiCard
              label="Competitive field"
              value={formatNumber(competitive.competitorCount)}
              icon={<IconFlag />}
              sub={`rival stores · ${formatNumber(competitive.whiteSpace.length)} white-space ZIPs`}
              delay={220}
            />
          ) : (
            <KpiCard
              label="Segments in file"
              value={formatNumber(segmentCount)}
              icon={<IconFlag />}
              sub="distinct audience segments"
              delay={220}
            />
          )}
        </div>

        {/* Composition */}
        {hasComposition && (
          <div className="mt-5">
            <SectionCard eyebrow="Grouped from segment names" title="Audience composition">
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
          </div>
        )}

        {/* Main grid */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Segment breakdown */}
          <div className="lg:col-span-7">
            <SectionCard
              eyebrow={`Full dataset · ${segmentCount} segments`}
              title="Audience segment breakdown"
              right={
                <div>
                  <p className="mom-stat text-[20px] font-semibold">{formatNumber(totalAudience)}</p>
                  <p className="text-[11px] text-[var(--faint)]">total audience</p>
                </div>
              }
            >
              <div className="divide-y divide-[var(--line-soft)]">
                {segments.map((seg, i) => (
                  <BarRow
                    key={seg.name}
                    rank={i + 1}
                    name={seg.name}
                    value={formatNumber(seg.total)}
                    share={seg.share}
                    ratio={seg.total / maxSegmentTotal}
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            <SectionCard
              eyebrow={topZipsScopeLabel}
              title="Top ZIP codes"
              right={<p className="text-[12px] text-[var(--muted)]">{formatNumber(topZips.length)} shown</p>}
            >
              <div className="space-y-1">
                {topZips.map((z, i) => (
                  <div key={z.zip} className="flex items-center gap-3 py-2">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] tnum font-bold"
                      style={
                        i === 0
                          ? { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }
                          : { color: 'var(--faint)' }
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="w-14 text-[13.5px] tnum font-medium text-[var(--ink-2)]">
                      {z.zip}
                    </span>
                    <div className="mom-bar-track flex-1">
                      <div
                        className="mom-bar-fill"
                        style={{ width: `${Math.max(4, (z.count / topZipMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-[13px] tnum font-semibold text-[var(--ink)]">
                      {formatNumber(z.count)}
                    </span>
                  </div>
                ))}
                {topZips.length === 0 && (
                  <p className="py-3 text-[13px] text-[var(--muted)]">No ZIP data available.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard eyebrow="Competitive context" title="Field & white space">
              {competitive.competitorCount > 0 ? (
                <div className="space-y-5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="mom-display text-[30px] font-semibold">
                      {formatNumber(competitive.competitorCount)}
                    </span>
                    <span className="text-[13px] text-[var(--muted)]">competitor stores in view</span>
                  </div>
                  {competitive.competitorBrands.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {competitive.competitorBrands.map(b => (
                        <Chip key={b}>{b}</Chip>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="text-[12px] font-medium text-[var(--ink-2)] mb-1">White-space ZIPs</p>
                    <p className="text-[11px] text-[var(--faint)] mb-3">
                      High audience with no competitor within {radiusMiles} mi
                    </p>
                    {competitive.whiteSpace.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {competitive.whiteSpace.map(z => (
                          <span
                            key={z.zip}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] tnum font-medium"
                            style={{
                              border: '1px solid var(--accent-line)',
                              color: 'var(--accent)',
                              background: 'var(--accent-soft)',
                            }}
                          >
                            {z.zip}
                            <span className="text-[var(--muted)]">{formatNumber(z.count)}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[var(--muted)]">
                        Competitors cover the high-audience ZIPs in this trade area.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-[var(--muted)]">
                  No competitors saved yet. Add rival dealerships in setup to reveal white-space ZIPs
                  and competitive coverage.
                </p>
              )}
            </SectionCard>
          </div>
        </div>

        {/* Methodology */}
        <p className="mt-7 text-[11px] leading-relaxed text-[var(--faint)] max-w-3xl">
          {datasetLabel ? `Source: ${datasetLabel}. ` : ''}
          “Reach” is the sum of segment counts across the active file; the same person can belong to
          more than one segment, so reach reflects total addressable touchpoints, not unique
          individuals. Trade-area figures use straight-line distance from the client pin to ZIP
          centroids (not drive-time).
        </p>
      </div>
    </div>
  );
}
