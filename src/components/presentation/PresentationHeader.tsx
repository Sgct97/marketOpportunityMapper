'use client';

import Link from 'next/link';

export type PresentationView = 'map' | 'dashboard';

interface Props {
  projectId: string;
  projectName: string;
  brandName: string;
  view: PresentationView;
  onViewChange: (view: PresentationView) => void;
  contextLabel?: string | null;
}

function MapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function PresentationHeader({
  projectId,
  projectName,
  brandName,
  view,
  onViewChange,
  contextLabel,
}: Props) {
  const monogram = (brandName?.trim()?.[0] ?? 'M').toUpperCase();

  return (
    <header
      className="relative z-20 flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 sm:px-6 h-16 shrink-0 backdrop-blur-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(12,18,32,0.82), rgba(8,12,22,0.72))',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 30px -24px rgba(0,0,0,0.9)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          href={`/projects/${projectId}`}
          className="hidden sm:inline-flex items-center text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          title="Back to project setup"
        >
          ← Setup
        </Link>
        <span className="hidden sm:block h-6 w-px bg-[var(--line)]" />
        <span
          className="grid place-items-center h-9 w-9 rounded-xl text-[15px] font-semibold shrink-0"
          style={{
            background: 'var(--accent-strong)',
            color: 'var(--on-accent)',
            boxShadow: '0 0 0 1px var(--accent-line), 0 6px 16px -6px var(--accent-soft)',
          }}
        >
          {monogram}
        </span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-[var(--ink)] truncate leading-tight">
            {projectName}
          </h1>
          <p className="text-[12px] text-[var(--muted)] truncate leading-tight">
            {brandName} · Market opportunity
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <div className="mom-segment" role="tablist" aria-label="Presentation view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'map'}
            data-active={view === 'map'}
            className="mom-segment-btn"
            onClick={() => onViewChange('map')}
          >
            <MapIcon />
            Map
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'dashboard'}
            data-active={view === 'dashboard'}
            className="mom-segment-btn"
            onClick={() => onViewChange('dashboard')}
          >
            <DashboardIcon />
            Dashboard
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 min-w-0 flex-1">
        {contextLabel && (
          <span className="hidden lg:block text-[12.5px] text-[var(--muted)] truncate max-w-[260px]">
            {contextLabel}
          </span>
        )}
        <span
          className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-line)',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          {brandName}
        </span>
      </div>
    </header>
  );
}
