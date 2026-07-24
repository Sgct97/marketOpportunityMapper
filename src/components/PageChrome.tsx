'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'mom-presentation-theme';

interface Props {
  title: string;
  /** Optional back link shown to the left of the title (e.g. "← Projects"). */
  backHref?: string;
  backLabel?: string;
  /** Optional right-aligned note (e.g. "Auth off"). */
  note?: ReactNode;
  /**
   * Agency id for brand skin (fonts/colors). Defaults to Dealer Media House so
   * setup/home match the default letterhead; pass project.brand_id when known.
   */
  agencyId?: string;
  children: ReactNode;
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

/**
 * Shared command-center page shell for the non-presentation screens (projects
 * list + setup). Mirrors the map/dashboard look: tokenized `.mom-canvas`
 * surface, glass topbar, and a dark/light toggle that shares the same
 * `localStorage` key as the presentation so the theme is consistent app-wide.
 */
export function PageChrome({
  title,
  backHref,
  backLabel,
  note,
  agencyId = 'dealer-media-house',
  children,
}: Props) {
  // Default to dark on server + first client render to avoid hydration
  // mismatch; the saved preference is applied after mount.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <div className="mom-canvas min-h-screen" data-theme={theme} data-agency={agencyId}>
      <header className="mom-topbar relative z-20 flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 sm:px-6 h-16">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="mom-nav-btn inline-flex items-center gap-1.5"
              title={backLabel ?? 'Back'}
            >
              <span aria-hidden>←</span>
              {backLabel ?? 'Back'}
            </Link>
          )}
          <h1 className="text-[15px] font-semibold text-[var(--ink)] truncate leading-tight">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {note && (
            <span className="hidden sm:block text-[12px] text-[var(--faint)]">{note}</span>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="mom-icon-btn"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
