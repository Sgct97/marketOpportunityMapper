import { websiteDomain } from '@/lib/dealership/infer-client';
import type { CompetitorCandidate, GeocodedPlace } from './types';
import { distanceMiles } from '@/lib/map/radius';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.primaryType';

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) {
    throw new Error(
      'Missing GOOGLE_PLACES_API_KEY. Add it to .env.local (Places API + Geocoding in Google Cloud).'
    );
  }
  return key;
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
}

function toPlace(raw: GooglePlace): GeocodedPlace | null {
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (lat == null || lng == null || !raw.id) return null;

  return {
    placeId: raw.id,
    name: raw.displayName?.text ?? 'Unknown',
    brand: null,
    address: raw.formattedAddress ?? '',
    latitude: lat,
    longitude: lng,
    website: raw.websiteUri ?? null,
  };
}

async function searchPlaces(body: Record<string, unknown>): Promise<GeocodedPlace[]> {
  const res = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  return (data.places ?? []).map(toPlace).filter((p): p is GeocodedPlace => Boolean(p));
}

export async function resolveClientDealer(options: {
  suggestedName: string;
  website?: string | null;
  biasLat?: number;
  biasLng?: number;
}): Promise<{ matches: GeocodedPlace[]; preferred: GeocodedPlace | null }> {
  const queries = [options.suggestedName];
  if (options.website) {
    const domain = websiteDomain(options.website);
    if (domain) queries.unshift(domain);
  }

  const locationBias =
    options.biasLat != null && options.biasLng != null
      ? {
          circle: {
            center: { latitude: options.biasLat, longitude: options.biasLng },
            radius: 80_000,
          },
        }
      : undefined;

  const seen = new Set<string>();
  const matches: GeocodedPlace[] = [];

  for (const textQuery of queries) {
    const batch = await searchPlaces({
      textQuery,
      pageSize: 5,
      ...(locationBias ? { locationBias } : {}),
    });

    for (const place of batch) {
      if (seen.has(place.placeId)) continue;
      seen.add(place.placeId);
      matches.push(place);
    }
  }

  let preferred: GeocodedPlace | null = matches[0] ?? null;
  if (options.website) {
    const domain = websiteDomain(options.website);
    const byWebsite = matches.find(
      p => p.website && websiteDomain(p.website) === domain
    );
    if (byWebsite) preferred = byWebsite;
  }

  return { matches, preferred };
}

export async function searchCompetitorDealers(options: {
  brand: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  excludePlaceIds?: string[];
}): Promise<CompetitorCandidate[]> {
  const radiusMeters = Math.min(Math.round(options.radiusMiles * 1609.34), 50_000);

  const places = await searchPlaces({
    textQuery: `${options.brand} car dealer`,
    pageSize: 20,
    locationBias: {
      circle: {
        center: { latitude: options.latitude, longitude: options.longitude },
        radius: radiusMeters,
      },
    },
  });

  const exclude = new Set(options.excludePlaceIds ?? []);

  return places
    .filter(p => !exclude.has(p.placeId))
    .map(p => ({
      ...p,
      brand: options.brand,
      distanceMiles: distanceMiles(
        options.latitude,
        options.longitude,
        p.latitude,
        p.longitude
      ),
    }))
    .filter(p => p.distanceMiles <= options.radiusMiles + 2)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
