/**
 * Enterprise basemap styles (Carto GL). The map basemap follows the active
 * presentation theme: Dark Matter on the dark "command center" surface (where
 * luminous choropleth and pins read best), Positron on the light surface.
 * Never use MapLibre demo tiles in production.
 *
 * Carto now requires an API key for raster tiles (and soon vector). Pass
 * `NEXT_PUBLIC_CARTO_API_KEY` so style + tile requests get `?key=…`.
 */
export const CARTO_DARK_MATTER =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const CARTO_POSITRON =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const CARTO_VOYAGER =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export type MapTheme = 'dark' | 'light';

function isCartoBasemapUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'basemaps.cartocdn.com' || host.endsWith('.basemaps.cartocdn.com');
  } catch {
    return false;
  }
}

/**
 * Append the Carto basemap API key to a style or tile URL when configured.
 * No-ops if the key is missing, the URL is not Carto, or `key=` is already present.
 */
export function appendCartoApiKey(
  url: string,
  apiKey: string | undefined = process.env.NEXT_PUBLIC_CARTO_API_KEY
): string {
  const key = apiKey?.trim();
  if (!key || !isCartoBasemapUrl(url)) return url;
  if (/[?&]key=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}key=${encodeURIComponent(key)}`;
}

/**
 * MapLibre `transformRequest` helper so every Carto CDN fetch (style, tiles,
 * glyphs, sprites) carries the API key — not only the initial style URL.
 */
export function cartoTransformRequest(url: string): { url: string } {
  return { url: appendCartoApiKey(url) };
}

/**
 * Resolved style URL chain for a theme: env override → theme primary →
 * theme fallback. An env override (`NEXT_PUBLIC_MAP_STYLE_URL`) always wins.
 */
export function resolveBasemapStyles(theme: MapTheme = 'dark'): string[] {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  const themed =
    theme === 'light'
      ? [CARTO_POSITRON, CARTO_VOYAGER]
      : [CARTO_DARK_MATTER, CARTO_VOYAGER];
  const chain = [custom, ...themed]
    .filter((url): url is string => Boolean(url))
    .map(url => appendCartoApiKey(url));
  return [...new Set(chain)];
}
