import { NextRequest, NextResponse } from 'next/server';
import { CENSUS_CHUNK_SIZE } from '@/lib/map/boundaries';

interface GeoJsonFeature {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry?: unknown;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

const TIGER_ZCTA_QUERY_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/11/query';
const CHUNK_SIZE = CENSUS_CHUNK_SIZE;
const CENSUS_TIMEOUT_MS = 12000;
const CENSUS_FETCH_CONCURRENCY = 4;
const FEATURE_CACHE_LIMIT = 5000;

const featureCache = new Map<string, GeoJsonFeature | null>();

function normalizeZip(zip: unknown): string | null {
  const raw = String(zip ?? '').trim();
  const digits = raw.match(/\d{5}/)?.[0];
  return digits || null;
}

function getFeatureZip(feature: GeoJsonFeature): string | null {
  const props = feature.properties || {};
  return normalizeZip(props.ZCTA5 || props.GEOID || props.BASENAME);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function rememberFeature(zip: string, feature: GeoJsonFeature | null) {
  if (featureCache.has(zip)) featureCache.delete(zip);
  featureCache.set(zip, feature);

  while (featureCache.size > FEATURE_CACHE_LIMIT) {
    const oldestKey = featureCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    featureCache.delete(oldestKey);
  }
}

async function fetchCensusChunk(group: string[]): Promise<void> {
  const params = new URLSearchParams({
    where: `ZCTA5 IN (${group.map(z => `'${z}'`).join(',')})`,
    outFields: 'ZCTA5,GEOID,BASENAME,NAME',
    returnGeometry: 'true',
    f: 'geojson',
    outSR: '4326',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CENSUS_TIMEOUT_MS);

  try {
    const response = await fetch(`${TIGER_ZCTA_QUERY_URL}?${params.toString()}`, {
      signal: controller.signal,
      next: { revalidate: 7 * 24 * 60 * 60 },
    });

    if (!response.ok) {
      console.error(`[ZCTA] Census query returned ${response.status}`);
      for (const zip of group) {
        if (!featureCache.has(zip)) rememberFeature(zip, null);
      }
      return;
    }

    const data = (await response.json()) as Partial<GeoJsonFeatureCollection>;
    const returned = new Set<string>();

    for (const feature of data.features || []) {
      if (feature?.type !== 'Feature') continue;
      const zip = getFeatureZip(feature);
      if (!zip) continue;
      returned.add(zip);
      rememberFeature(zip, feature);
    }

    for (const zip of group) {
      if (!returned.has(zip) && !featureCache.has(zip)) rememberFeature(zip, null);
    }
  } catch (error) {
    console.error('[ZCTA] Census query failed for chunk:', error);
    for (const zip of group) {
      if (!featureCache.has(zip)) rememberFeature(zip, null);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < items.length) {
      const current = items[index++]!;
      await worker(current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
}

async function fetchZipFeatures(zips: string[]): Promise<void> {
  const groups = chunk(zips, CHUNK_SIZE);
  await runWithConcurrency(groups, CENSUS_FETCH_CONCURRENCY, fetchCensusChunk);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { zips?: unknown[] };
    const zips = Array.from(
      new Set((body.zips || []).map(normalizeZip).filter((zip): zip is string => Boolean(zip)))
    ).sort();

    if (zips.length === 0) {
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        meta: { requested: 0, returned: 0 },
      });
    }

    const missing = zips.filter(zip => !featureCache.has(zip));
    if (missing.length > 0) await fetchZipFeatures(missing);

    const features = zips
      .map(zip => featureCache.get(zip))
      .filter((feature): feature is GeoJsonFeature => Boolean(feature));

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      meta: {
        requested: zips.length,
        returned: features.length,
      },
    });
  } catch (error) {
    console.error('ZCTA boundary lookup failed:', error);
    return NextResponse.json(
      { error: 'Failed to load ZIP boundary data', type: 'FeatureCollection', features: [] },
      { status: 500 }
    );
  }
}
