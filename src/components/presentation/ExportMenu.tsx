'use client';

import { useEffect, useRef, useState } from 'react';

type ExportKind = 'pdf' | 'png';

interface Props {
  onExportPdf: () => void | Promise<void>;
  onExportPng: () => void | Promise<void>;
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ExportMenu({ onExportPdf, onExportPng }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(kind: ExportKind, fn: () => void | Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mom-nav-btn inline-flex items-center gap-1.5"
        title="Export the presentation"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Spinner /> : <DownloadIcon />}
        {busy ? 'Exporting…' : 'Export'}
      </button>

      {open && (
        <div
          role="menu"
          className="mom-card absolute right-0 z-30 mt-2 w-56 overflow-hidden p-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run('pdf', onExportPdf)}
            className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="text-[13px] font-semibold text-[var(--ink)]">Branded PDF report</span>
            <span className="text-[11px] text-[var(--muted)]">Map + market story, client-ready</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run('png', onExportPng)}
            className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="text-[13px] font-semibold text-[var(--ink)]">Map image (PNG)</span>
            <span className="text-[11px] text-[var(--muted)]">Current map snapshot</span>
          </button>
        </div>
      )}
    </div>
  );
}
