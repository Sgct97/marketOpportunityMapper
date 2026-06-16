/**
 * Enterprise basemap styles (Carto GL). The presentation surface is a dark
 * "command center", so the map uses Dark Matter to match — luminous choropleth
 * and pins read far better on a dark basemap than on a light one. Voyager stays
 * as a last-resort fallback. Never use MapLibre demo tiles in production.
 */
export const CARTO_DARK_MATTER =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const CARTO_VOYAGER =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

/** Resolved style URL chain: env override → Dark Matter → Voyager */
export function resolveBasemapStyles(): string[] {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  const chain = [custom, CARTO_DARK_MATTER, CARTO_VOYAGER].filter(
    (url): url is string => Boolean(url)
  );
  return [...new Set(chain)];
}
