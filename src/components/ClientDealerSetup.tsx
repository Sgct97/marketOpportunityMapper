'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  confirmClientDealer,
  lookupClientDealer,
} from '@/app/actions/client-dealer';
import type { GeocodedPlace } from '@/lib/geocode/types';

interface Props {
  projectId: string;
  initialName: string;
  initialBrand: string | null;
  initialWebsite: string;
  audienceFileName: string | null;
  confirmedClient: {
    id: string;
    name: string;
    brand: string;
    address: string | null;
  } | null;
}

export function ClientDealerSetup({
  projectId,
  initialName,
  initialBrand,
  initialWebsite,
  audienceFileName,
  confirmedClient,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState(initialBrand ?? '');
  const [website, setWebsite] = useState(initialWebsite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<GeocodedPlace[]>([]);
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(confirmedClient);

  // Re-sync when the server sends a new confirmed client (e.g. after refresh).
  // Adjusting state during render avoids the cascading-effect anti-pattern.
  const [prevConfirmedClient, setPrevConfirmedClient] = useState(confirmedClient);
  if (confirmedClient !== prevConfirmedClient) {
    setPrevConfirmedClient(confirmedClient);
    setConfirmed(confirmedClient);
  }

  async function handleLookup() {
    setPending(true);
    setError(null);
    setMatches([]);

    const result = await lookupClientDealer(projectId, {
      suggestedName: name,
      website,
    });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMatches(result.matches ?? []);
    setPreferredId(result.preferred?.placeId ?? result.matches?.[0]?.placeId ?? null);
  }

  async function handleConfirm(place: GeocodedPlace) {
    if (!brand.trim()) {
      setError('Brand is required (e.g. Hyundai, Toyota).');
      return;
    }

    setPending(true);
    setError(null);
    const result = await confirmClientDealer(projectId, place, brand.trim());
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setConfirmed({
      id: result.dealershipId!,
      name: place.name,
      brand: brand.trim(),
      address: place.address,
    });
    setMatches([]);
    router.refresh();
  }

  return (
    <div className="mom-card p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)]">Client dealership</h3>
        <p className="text-xs text-[var(--muted)] mt-1.5">
          Suggested from your audience file name
          {audienceFileName ? ` (${audienceFileName})` : ''}. Look up by name, or add the dealer
          website to pinpoint the store when names are ambiguous. Confirm before competitor search.
        </p>
      </div>

      {confirmed ? (
        <div className="mom-success px-4 py-3 text-sm space-y-1">
          <p className="font-semibold">Confirmed client: {confirmed.name}</p>
          <p className="text-xs">{confirmed.brand}</p>
          {confirmed.address && <p className="text-xs">{confirmed.address}</p>}
          <button
            type="button"
            onClick={() => {
              setConfirmed(null);
              setMatches([]);
            }}
            className="mom-link text-xs mt-2"
          >
            Change dealership
          </button>
        </div>
      ) : (
        <>
          <label className="block text-xs text-[var(--ink-2)]">
            <span className="font-semibold">Dealer name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mom-field mt-1.5 text-sm"
              placeholder="Hyundai of Glendora"
            />
          </label>

          <label className="block text-xs text-[var(--ink-2)]">
            <span className="font-semibold">Brand</span>
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="mom-field mt-1.5 text-sm"
              placeholder="Hyundai"
            />
          </label>

          <label className="block text-xs text-[var(--ink-2)]">
            <span className="font-semibold">Dealer website (optional)</span>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              type="url"
              className="mom-field mt-1.5 text-sm"
              placeholder="https://www.dealerwebsite.com"
            />
          </label>

          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => void handleLookup()}
            className="mom-btn-accent"
          >
            {pending ? 'Looking up…' : 'Look up dealership'}
          </button>

          {matches.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--line)]">
              <div className="mom-warn px-3 py-2 text-xs">
                Lookup found {matches.length} location{matches.length === 1 ? '' : 's'}. Click{' '}
                <span className="font-semibold">Confirm and save to map</span> below — the map only
                shows dealerships after you confirm.
              </div>
              <p className="mom-eyebrow">Confirm location</p>
              {matches.map(place => (
                <div
                  key={place.placeId}
                  className={`mom-inset px-3 py-3 text-sm ${
                    place.placeId === preferredId
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                      : ''
                  }`}
                >
                  <p className="font-semibold text-[var(--ink)]">{place.name}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{place.address}</p>
                  {place.website && (
                    <p className="text-xs text-[var(--muted)] truncate">{place.website}</p>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void handleConfirm(place)}
                    className="mom-btn-accent mt-3 h-9 text-xs"
                  >
                    {pending ? 'Saving…' : 'Confirm and save to map'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-[var(--alert-text)]">{error}</p>}
    </div>
  );
}
