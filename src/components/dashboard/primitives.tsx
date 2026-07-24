import type { ReactNode } from 'react';
import { hexToRgb } from '@/lib/map/colors';
import { formatPercent, EMPTY_VALUE } from '@/lib/format';

export function tint(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

export function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 5.2A3.2 3.2 0 0 1 16 11M17.5 14c2.4.5 4 2.4 4 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFlag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 21V4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 4.5h11l-2 3.5 2 3.5H6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

/* ── KPI ───────────────────────────────────────────────────────────────── */

export function KpiCard({
  label,
  value,
  accent,
  sub,
  icon,
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: string | null;
  sub?: ReactNode;
  icon?: ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="mom-card mom-card-lg p-5 sm:p-6 mom-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="mom-eyebrow">{label}</p>
        {icon && <span className="mom-tile h-8 w-8">{icon}</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-2.5">
        <span className="mom-display text-[40px] sm:text-[46px] font-semibold tnum">{value}</span>
        {accent && (
          <span className="mom-display-accent text-[15px] font-bold tnum">{accent}</span>
        )}
      </div>
      {sub && <p className="mt-2.5 text-[12.5px] leading-snug text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

export function SectionCard({
  eyebrow,
  title,
  right,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mom-card mom-card-lg p-5 sm:p-6 ${className}`}>
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="mom-eyebrow">{eyebrow}</p>
          <h3 className="mt-1.5 text-[17px] font-semibold text-[var(--ink)] tracking-tight">
            {title}
          </h3>
        </div>
        {right && <div className="shrink-0 text-right">{right}</div>}
      </header>
      {children}
    </section>
  );
}

export function BarRow({
  rank,
  name,
  value,
  share,
  ratio,
}: {
  rank?: number;
  name: string;
  value: string;
  share: number;
  ratio: number;
}) {
  return (
    <div className="group py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-2.5 min-w-0">
          {rank != null && (
            <span className="w-5 shrink-0 text-[11px] tnum font-semibold text-[var(--faint)]">
              {String(rank).padStart(2, '0')}
            </span>
          )}
          <span className="text-[13.5px] text-[var(--ink-2)] truncate" title={name}>
            {name}
          </span>
        </span>
        <span className="shrink-0 tnum">
          <span className="font-semibold text-[var(--ink)]">{value}</span>
          <span className="ml-2 text-[12px] text-[var(--faint)]">{formatPercent(share)}</span>
        </span>
      </div>
      <div className="mom-bar-track mt-2">
        <div className="mom-bar-fill" style={{ width: `${Math.max(2, ratio * 100)}%` }} />
      </div>
    </div>
  );
}

/* ── Donut ─────────────────────────────────────────────────────────────── */

const DONUT_ALPHAS = [1, 0.58, 0.38, 0.25, 0.16];

export function Donut({
  title,
  buckets,
  accent,
}: {
  title: string;
  buckets: { label: string; total: number; share: number }[];
  accent: string;
}) {
  const size = 128;
  const stroke = 15;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const top = buckets[0];

  let acc = 0;
  const arcs = buckets.map((b, i) => {
    const len = b.share * c;
    const arc = { len, offset: acc, color: tint(accent, DONUT_ALPHAS[i] ?? 0.12) };
    acc += len;
    return arc;
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {arcs.map((arc, i) => (
            <circle
              key={buckets[i]!.label}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, arc.len - 1.5)} ${c - Math.max(0, arc.len - 1.5)}`}
              strokeDashoffset={-arc.offset}
              transform={`rotate(-90 ${cx} ${cx})`}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center px-5">
          <div className="min-w-0 max-w-full">
            <p className="mom-stat text-[22px] font-semibold leading-none">
              {top ? formatPercent(top.share) : EMPTY_VALUE}
            </p>
            {/* Cap width so long titles (e.g. "General Market") wrap inside the
                hole — available chord width is narrower below the center. */}
            <p className="mt-0.5 mx-auto max-w-[4.5rem] text-[9px] uppercase tracking-[0.04em] leading-snug text-[var(--faint)]">
              {title}
            </p>
          </div>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-2">
        {buckets.map((b, i) => (
          <li key={b.label} className="flex items-center gap-2.5 text-[12.5px]">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: tint(accent, DONUT_ALPHAS[i] ?? 0.12) }}
            />
            <span className="text-[var(--ink-2)] flex-1 truncate" title={b.label}>
              {b.label}
            </span>
            <span className="tnum font-semibold text-[var(--ink)]">{formatPercent(b.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[12.5px] font-medium text-[var(--ink-2)]">
      {children}
    </span>
  );
}
