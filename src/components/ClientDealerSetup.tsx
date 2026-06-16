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
    <div className="bg-white border border-[#E2E8F0] p-6 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[#2D3748]">Client dealership</h3>
        <p className="text-xs text-[#718096] mt-1">
          Suggested from your audience file name
          {audienceFileName ? ` (${audienceFileName})` : ''}. Look up by name, or add the dealer
          website to pinpoint the store when names are ambiguous. Confirm before competitor search.
        </p>
      </div>

      {confirmed ? (
        <div className="border border-[#9AE6B4] bg-[#F0FFF4] px-4 py-3 text-sm text-[#22543D] space-y-1">
          <p className="font-medium">Confirmed client: {confirmed.name}</p>
          <p className="text-xs">{confirmed.brand}</p>
          {confirmed.address && <p className="text-xs">{confirmed.address}</p>}
          <button
            type="button"
            onClick={() => {
              setConfirmed(null);
              setMatches([]);
            }}
            className="text-xs text-[#4BA5A5] hover:underline mt-2"
          >
            Change dealership
          </button>
        </div>
      ) : (
        <>
          <label className="block text-xs text-[#2D3748]">
            <span className="font-medium">Dealer name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#4BA5A5]"
              placeholder="Hyundai of Glendora"
            />
          </label>

          <label className="block text-xs text-[#2D3748]">
            <span className="font-medium">Brand</span>
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="mt-1 w-full border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#4BA5A5]"
              placeholder="Hyundai"
            />
          </label>

          <label className="block text-xs text-[#2D3748]">
            <span className="font-medium">Dealer website (optional)</span>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              type="url"
              className="mt-1 w-full border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#4BA5A5]"
              placeholder="https://www.dealerwebsite.com"
            />
          </label>

          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => void handleLookup()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4BA5A5] hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Looking up…' : 'Look up dealership'}
          </button>

          {matches.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <div className="border border-[#FBD38D] bg-[#FFFAF0] px-3 py-2 text-xs text-[#744210]">
                Lookup found {matches.length} location{matches.length === 1 ? '' : 's'}. Click{' '}
                <span className="font-medium">Confirm and save to map</span> below — the map only
                shows dealerships after you confirm.
              </div>
              <p className="text-xs font-medium text-[#718096] uppercase tracking-wide">
                Confirm location
              </p>
              {matches.map(place => (
                <div
                  key={place.placeId}
                  className={`border px-3 py-3 text-sm ${
                    place.placeId === preferredId
                      ? 'border-[#4BA5A5] bg-[#4BA5A5]/5'
                      : 'border-[#E2E8F0]'
                  }`}
                >
                  <p className="font-medium text-[#2D3748]">{place.name}</p>
                  <p className="text-xs text-[#718096] mt-0.5">{place.address}</p>
                  {place.website && (
                    <p className="text-xs text-[#718096] truncate">{place.website}</p>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void handleConfirm(place)}
                    className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#4BA5A5] hover:opacity-90 disabled:opacity-50"
                  >
                    {pending ? 'Saving…' : 'Confirm and save to map'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-[#C53030]">{error}</p>}
    </div>
  );
}
