'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  removeCompetitor,
  saveCompetitorSelection,
  searchProjectCompetitors,
} from '@/app/actions/competitors';
import type { CompetitorCandidate } from '@/lib/geocode/types';
import { RADIUS_MILES_OPTIONS, type RadiusMiles } from '@/lib/projects/settings';

interface ExistingCompetitor {
  id: string;
  name: string;
  brand: string;
  address: string | null;
}

interface Props {
  projectId: string;
  clientConfirmed: boolean;
  initialBrand: string;
  initialRadiusMiles: RadiusMiles;
  existingCompetitors: ExistingCompetitor[];
}

export function CompetitorReview({
  projectId,
  clientConfirmed,
  initialBrand,
  initialRadiusMiles,
  existingCompetitors,
}: Props) {
  const router = useRouter();
  const [brand, setBrand] = useState(initialBrand);
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(initialRadiusMiles);
  const [candidates, setCandidates] = useState<CompetitorCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSearch() {
    setPending(true);
    setError(null);
    setMessage(null);

    const result = await searchProjectCompetitors(projectId, { brand, radiusMiles });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const list = result.candidates ?? [];
    setCandidates(list);
    setSelected(new Set(list.map(c => c.placeId)));
  }

  function toggle(placeId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  async function handleSave() {
    const picks = candidates.filter(c => selected.has(c.placeId));
    setPending(true);
    setError(null);

    const result = await saveCompetitorSelection(projectId, picks, brand.trim());
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage(`Saved ${result.count ?? 0} competitor${result.count === 1 ? '' : 's'} to the map.`);
    setCandidates([]);
    router.refresh();
  }

  async function handleRemove(id: string) {
    await removeCompetitor(projectId, id);
    router.refresh();
  }

  if (!clientConfirmed) {
    return (
      <div className="mom-card p-6">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Competitors</h3>
        <p className="text-xs text-[var(--muted)] mt-1.5">
          Confirm the client dealership above, then search for competitors by brand and radius.
        </p>
      </div>
    );
  }

  return (
    <div className="mom-card p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)]">Competitors</h3>
        <p className="text-xs text-[var(--muted)] mt-1.5">
          Search nearby dealers by brand, review results, and save to the map. Saving updates
          competitors for that brand only — other brands already on the map are kept.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 text-xs text-[var(--ink-2)]">
          <span className="font-semibold">Competitor brand</span>
          <input
            value={brand}
            onChange={e => setBrand(e.target.value)}
            className="mom-field mt-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--ink-2)] sm:w-28">
          <span className="font-semibold">Radius</span>
          <select
            value={radiusMiles}
            onChange={e => setRadiusMiles(Number(e.target.value) as RadiusMiles)}
            className="mom-field mt-1.5 text-sm"
          >
            {RADIUS_MILES_OPTIONS.map(m => (
              <option key={m} value={m}>
                {m} mi
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={pending || !brand.trim()}
        onClick={() => void handleSearch()}
        className="mom-btn-accent"
      >
        {pending ? 'Searching…' : 'Search competitors'}
      </button>

      {candidates.length > 0 && (
        <div className="space-y-2 border-t border-[var(--line)] pt-3">
          <p className="mom-eyebrow">Review results ({candidates.length})</p>
          <div className="max-h-56 overflow-y-auto space-y-1 mom-scroll">
            {candidates.map(c => (
              <label
                key={c.placeId}
                className="flex items-start gap-2 text-xs py-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.placeId)}
                  onChange={() => toggle(c.placeId)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="font-semibold text-[var(--ink-2)]">{c.name}</span>
                  <span className="text-[var(--muted)]"> · {c.distanceMiles.toFixed(1)} mi</span>
                  {c.address && (
                    <span className="block text-[var(--muted)]">{c.address}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleSave()}
            className="mom-link text-sm"
          >
            Save selected to map
          </button>
        </div>
      )}

      {existingCompetitors.length > 0 && (
        <div className="border-t border-[var(--line)] pt-3 space-y-1">
          <p className="mom-eyebrow">On map ({existingCompetitors.length})</p>
          {existingCompetitors.map(c => (
            <div key={c.id} className="flex justify-between gap-2 text-xs text-[var(--ink-2)] py-1">
              <span>
                {c.name}
                <span className="text-[var(--muted)]"> · {c.brand}</span>
              </span>
              <button
                type="button"
                onClick={() => void handleRemove(c.id)}
                className="text-[var(--muted)] hover:text-[var(--alert-text)] shrink-0 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm text-[var(--success-text)]">{message}</p>}
      {error && <p className="text-sm text-[var(--alert-text)]">{error}</p>}
    </div>
  );
}
