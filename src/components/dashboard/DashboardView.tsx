import type { DashboardModel } from '@/lib/audience/dashboard';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';
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
    ethnicity,
    intent,
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
  const hasComposition = ethnicity.length > 0 || intent.length > 0;

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
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
                <p className="mom-eyebrow">Market opportunity · {subjectName}</p>
              </div>
              <h2 className="mt-4 text-[26px] sm:text-[32px] font-semibold leading-[1.18] tracking-tight text-[var(--ink)]">
                <span className="mom-display-accent tnum">{formatNumber(totalAudience)}</span>{' '}
                addressable audience across{' '}
                <span className="tnum text-[var(--ink)]">{formatNumber(totalZips)}</span> ZIP codes
                and {segmentCount} segments.
                {useTradeArea && (
                  <>
                    {' '}
                    <span className="text-[var(--ink-2)]">
                      {formatPercent(tradeArea!.share)} sits within{' '}
                      {subjectName ? `${subjectName}'s` : 'the'} {radiusMiles}-mile trade area.
                    </span>
                  </>
                )}
              </h2>
            </div>
            <div className="shrink-0">
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
            label="Addressable audience"
            value={formatCompact(totalAudience)}
            icon={<IconUsers />}
            sub={`${formatNumber(totalZips)} ZIPs · ${segmentCount} segments`}
            delay={40}
          />
          {useTradeArea ? (
            <KpiCard
              label={`Within ${radiusMiles} mi`}
              value={formatCompact(tradeArea!.audienceInRadius)}
              accent={formatPercent(tradeArea!.share)}
              icon={<IconTarget />}
              sub={`of total market · ${formatNumber(tradeArea!.zipsInRadius)} ZIPs`}
              delay={100}
            />
          ) : (
            <KpiCard
              label="Lead segment"
              value={topSegment ? formatPercent(topSegment.share) : '—'}
              icon={<IconTarget />}
              sub={topSegment?.name ?? 'No segments'}
              delay={100}
            />
          )}
          <KpiCard
            label="Market concentration"
            value={formatPercent(concentration.top5Share)}
            icon={<IconLayers />}
            sub={`from the top 5 ZIPs · ${formatNumber(concentration.zipsForHalf)} ZIPs make up half`}
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
            <SectionCard eyebrow="Who they are" title="Audience composition">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-10">
                {ethnicity.length > 0 && (
                  <Donut title="Ethnicity" buckets={ethnicity} accent={glow} />
                )}
                {intent.length > 0 && (
                  <Donut title="Intent" buckets={intent} accent={glow} />
                )}
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
          Audience is the sum of all segment counts in the active file; individuals may appear in
          more than one segment. Trade-area figures use straight-line distance from the client pin to
          ZIP centroids (not drive-time).
        </p>
      </div>
    </div>
  );
}
