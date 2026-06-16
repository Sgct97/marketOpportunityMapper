/**
 * Enterprise basemap styles (Carto GL). The map basemap follows the active
 * presentation theme: Dark Matter on the dark "command center" surface (where
 * luminous choropleth and pins read best), Positron on the light surface.
 * Never use MapLibre demo tiles in production.
 */
export const CARTO_DARK_MATTER =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const CARTO_POSITRON =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const CARTO_VOYAGER =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export type MapTheme = 'dark' | 'light';

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
  const chain = [custom, ...themed].filter((url): url is string => Boolean(url));
  return [...new Set(chain)];
}
