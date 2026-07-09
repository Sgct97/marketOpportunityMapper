import type { RankedCompetitor } from '@/lib/dealership/rank-competitors';
import { competitorPinColor, competitorPinLabelColor } from '@/lib/brands';
import type { MapTheme } from '@/lib/map/basemap';

interface Props {
  competitors: RankedCompetitor[];
  theme?: MapTheme;
  className?: string;
}

function formatDistance(miles: number | null): string | null {
  if (miles == null) return null;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function CompetitorLegend({ competitors, theme = 'dark', className = '' }: Props) {
  if (competitors.length === 0) return null;

  const uniqueBrands = [...new Set(competitors.map(c => c.brand))];

  return (
    <div
      className={`mom-map-chip max-w-[min(100vw-1.25rem,14.5rem)] p-0 overflow-hidden text-[11px] ${className}`}
      aria-label="Competitor legend"
    >
      <div className="px-2.5 py-1.5 border-b border-[var(--line)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Competitors
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--faint)] leading-tight">
          {uniqueBrands.length > 1 ? 'Colored by brand · nearest first' : 'Nearest to focus client'}
        </p>
      </div>
      <ol className="max-h-32 overflow-y-auto py-1">
        {competitors.map(c => {
          const distance = formatDistance(c.distanceMiles);
          const pinColor = competitorPinColor(c.brand, theme, c.name);
          const labelColor = competitorPinLabelColor(pinColor);
          return (
            <li
              key={c.id}
              className="flex items-start gap-2 px-2.5 py-1 text-[11px] leading-snug"
            >
              <span
                className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white text-[9px] font-bold shadow-sm tnum"
                style={{ backgroundColor: pinColor, color: labelColor }}
                aria-hidden
              >
                {c.rank}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-[var(--ink)]">{c.name}</span>
                <span className="block truncate text-[10px] text-[var(--muted)]">
                  <span style={{ color: pinColor }}>{c.brand}</span>
                  {distance ? ` · ${distance}` : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
