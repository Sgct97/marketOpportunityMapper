'use client';

import Link from 'next/link';
import { ExportMenu } from './ExportMenu';

export type PresentationView = 'map' | 'dashboard';
export type PresentationTheme = 'dark' | 'light';

interface Props {
  projectId: string;
  projectName: string;
  brandName: string;
  view: PresentationView;
  onViewChange: (view: PresentationView) => void;
  contextLabel?: string | null;
  theme: PresentationTheme;
  onToggleTheme: () => void;
  onExportPdf: () => void | Promise<void>;
  onExportPng: () => void | Promise<void>;
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 13.5A8 8 0 0 1 10.5 4a7 7 0 1 0 9.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 11.5 12 4l8 7.5M6 10v9h12v-9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  theme,
  onToggleTheme,
  onExportPdf,
  onExportPng,
}: Props) {
  const monogram = (brandName?.trim()?.[0] ?? 'M').toUpperCase();

  return (
    <header className="mom-topbar relative z-20 flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 sm:px-6 h-16 shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          href="/"
          className="mom-nav-btn hidden sm:inline-flex items-center gap-1.5"
          title="Back to all projects"
        >
          <HomeIcon />
          Projects
        </Link>
        <Link
          href={`/projects/${projectId}`}
          className="mom-nav-btn hidden sm:inline-flex items-center gap-1.5"
          title="Back to project setup"
        >
          <span aria-hidden>←</span>
          Setup
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
          <span className="hidden lg:block text-[12.5px] text-[var(--muted)] truncate max-w-[240px]">
            {contextLabel}
          </span>
        )}
        <ExportMenu onExportPdf={onExportPdf} onExportPng={onExportPng} />
        <button
          type="button"
          onClick={onToggleTheme}
          className="mom-icon-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
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
