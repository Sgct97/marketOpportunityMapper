'use client';

import { useRef, useState } from 'react';
import { uploadDealershipFile } from '@/app/actions/dealership';
import type { DealershipImportSummary } from '@/lib/dealership/types';

interface Props {
  projectId: string;
}

export function DealershipUpload({ projectId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DealershipImportSummary | null>(null);

  async function handleFile(file: File) {
    setPending(true);
    setError(null);
    setSummary(null);

    const formData = new FormData();
    formData.set('file', file);

    const result = await uploadDealershipFile(projectId, formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      if (result.summary) setSummary(result.summary);
      return;
    }

    if (result.summary) setSummary(result.summary);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="mom-card p-6">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Dealerships</h3>
      <p className="text-xs text-[var(--muted)] mt-1.5 mb-4">
        CSV/XLSX with Dealership Name, Brand, Role (client/competitor), and latitude/longitude or address
      </p>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="mom-dropzone px-6 py-10 text-center cursor-pointer"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onInputChange}
        />
        <p className="text-sm font-medium text-[var(--ink-2)]">
          {pending ? 'Importing…' : 'Drag and drop a file, or click to browse'}
        </p>
        <p className="text-xs text-[var(--faint)] mt-1">.csv, .xlsx</p>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--alert-text)]">{error}</p>}

      {summary && (
        <div className="mom-success mt-4 p-4 text-sm space-y-1">
          <p className="font-semibold">Import complete: {summary.fileName}</p>
          <p>Rows imported: {summary.rowsImported.toLocaleString('en-US')}</p>
          {summary.invalidRows > 0 && (
            <p>Skipped: {summary.invalidRows.toLocaleString('en-US')}</p>
          )}
          <p>
            Client: {summary.clientCount} · Competitor: {summary.competitorCount}
          </p>
          <p>On map: {summary.mappableCount.toLocaleString('en-US')}</p>
          {summary.pendingGeocodeCount > 0 && (
            <p className="opacity-80">
              Pending geocode: {summary.pendingGeocodeCount} (address only — not shown on map yet)
            </p>
          )}
          <p>Brands: {summary.brands.join(', ') || '—'}</p>
          {summary.invalid.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Invalid rows (first {summary.invalid.length})</summary>
              <ul className="mt-1 list-disc pl-4">
                {summary.invalid.map((inv, i) => (
                  <li key={i}>
                    Row {inv.row}: {inv.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
