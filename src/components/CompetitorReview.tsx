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
      <div className="bg-white border border-[#E2E8F0] p-6">
        <h3 className="text-sm font-medium text-[#2D3748]">Competitors</h3>
        <p className="text-xs text-[#718096] mt-1">
          Confirm the client dealership above, then search for competitors by brand and radius.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] p-6 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[#2D3748]">Competitors</h3>
        <p className="text-xs text-[#718096] mt-1">
          Search nearby dealers by brand, review results, and save to the map.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 text-xs text-[#2D3748]">
          <span className="font-medium">Competitor brand</span>
          <input
            value={brand}
            onChange={e => setBrand(e.target.value)}
            className="mt-1 w-full border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#4BA5A5]"
          />
        </label>
        <label className="text-xs text-[#2D3748] sm:w-28">
          <span className="font-medium">Radius</span>
          <select
            value={radiusMiles}
            onChange={e => setRadiusMiles(Number(e.target.value) as RadiusMiles)}
            className="mt-1 w-full border border-[#E2E8F0] px-2 py-2 text-sm bg-white"
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
        className="px-4 py-2 text-sm font-medium text-white bg-[#4BA5A5] hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Searching…' : 'Search competitors'}
      </button>

      {candidates.length > 0 && (
        <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
          <p className="text-xs font-medium text-[#718096] uppercase tracking-wide">
            Review results ({candidates.length})
          </p>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {candidates.map(c => (
              <label
                key={c.placeId}
                className="flex items-start gap-2 text-xs py-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.placeId)}
                  onChange={() => toggle(c.placeId)}
                  className="mt-0.5 accent-[#4BA5A5]"
                />
                <span>
                  <span className="font-medium text-[#2D3748]">{c.name}</span>
                  <span className="text-[#718096]"> · {c.distanceMiles.toFixed(1)} mi</span>
                  {c.address && (
                    <span className="block text-[#718096]">{c.address}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleSave()}
            className="text-sm font-medium text-[#4BA5A5] hover:underline"
          >
            Save selected to map
          </button>
        </div>
      )}

      {existingCompetitors.length > 0 && (
        <div className="border-t border-[#E2E8F0] pt-3 space-y-1">
          <p className="text-xs font-medium text-[#718096] uppercase tracking-wide">
            On map ({existingCompetitors.length})
          </p>
          {existingCompetitors.map(c => (
            <div key={c.id} className="flex justify-between gap-2 text-xs text-[#2D3748] py-1">
              <span>{c.name}</span>
              <button
                type="button"
                onClick={() => void handleRemove(c.id)}
                className="text-[#718096] hover:text-[#C53030] shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm text-[#22543D]">{message}</p>}
      {error && <p className="text-sm text-[#C53030]">{error}</p>}
    </div>
  );
}
