'use client';

import { useRef, useState } from 'react';
import { uploadAudienceFile } from '@/app/actions/audience';
import type { AudienceImportSummary } from '@/lib/audience/validate';

interface Props {
  projectId: string;
}

export function AudienceUpload({ projectId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AudienceImportSummary | null>(null);

  async function handleFile(file: File) {
    setPending(true);
    setError(null);
    setSummary(null);

    const formData = new FormData();
    formData.set('file', file);

    const result = await uploadAudienceFile(projectId, formData);
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
    <div className="bg-white border border-[#E2E8F0] p-6">
      <h3 className="text-sm font-medium text-[#2D3748]">Audience data</h3>
      <p className="text-xs text-[#718096] mt-1 mb-4">
        CSV/XLSX: long format (ZIP, Audience Type, Count) or wide format (ZIP/ZIPS + segment columns per Brittany&apos;s exports)
      </p>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-[#E2E8F0] rounded-sm px-6 py-10 text-center cursor-pointer hover:border-[#4BA5A5] hover:bg-[#F7FAFC] transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onInputChange}
        />
        <p className="text-sm text-[#2D3748]">
          {pending ? 'Importing…' : 'Drag and drop a file, or click to browse'}
        </p>
        <p className="text-xs text-[#A0AEC0] mt-1">.csv, .xlsx</p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-[#C53030]">{error}</p>
      )}

      {summary && (
        <div className="mt-4 p-4 bg-[#F0FFF4] border border-[#9AE6B4] text-sm text-[#22543D] space-y-1">
          <p className="font-medium">Import complete: {summary.fileName}</p>
          <p>Rows processed: {summary.rowsProcessed.toLocaleString()}</p>
          <p>Rows imported: {summary.rowsImported.toLocaleString()}</p>
          {summary.invalidRows > 0 && (
            <p>Skipped: {summary.invalidRows.toLocaleString()}</p>
          )}
          <p>Total audience: {summary.totalAudience.toLocaleString()}</p>
          <p>ZIPs: {summary.zips.length.toLocaleString()}</p>
          <p>Format: {summary.format === 'wide' ? 'Wide (segment columns)' : 'Long'}</p>
          <p>Types: {summary.audienceTypes.length} segment{summary.audienceTypes.length === 1 ? '' : 's'}</p>
          {summary.invalid.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Invalid rows (first {summary.invalid.length})</summary>
              <ul className="mt-1 list-disc pl-4">
                {summary.invalid.map((inv, i) => (
                  <li key={i}>Row {inv.row}: {inv.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
