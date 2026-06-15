import type { FeatureCollection, Geometry } from 'geojson';

/** Census TIGER queries accept ~25 ZCTA5 codes per request. */
export const CENSUS_CHUNK_SIZE = 25;

/** Batch size for client → /api/zcta-boundaries (keeps each HTTP request bounded). */
export const BOUNDARY_API_BATCH_SIZE = 150;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Fetch all ZIP boundaries in batches; merges into one FeatureCollection. */
export async function fetchZipBoundaries(
  zips: string[],
  signal?: AbortSignal
): Promise<FeatureCollection<Geometry>> {
  if (zips.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const batches = chunk(zips, BOUNDARY_API_BATCH_SIZE);
  const features: FeatureCollection<Geometry>['features'] = [];

  for (const batch of batches) {
    if (signal?.aborted) break;

    const res = await fetch('/api/zcta-boundaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zips: batch }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Boundary service returned ${res.status}`);
    }

    const data = (await res.json()) as FeatureCollection<Geometry>;
    if (data.features?.length) {
      features.push(...data.features);
    }
  }

  return { type: 'FeatureCollection', features };
}
