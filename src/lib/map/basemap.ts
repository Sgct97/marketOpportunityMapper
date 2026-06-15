/**
 * Enterprise basemap styles (Carto GL — same family as dashboard light_all tiles).
 * Never use MapLibre demo tiles in production; they are simplified placeholders.
 */
export const CARTO_VOYAGER =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export const CARTO_POSITRON =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** Resolved style URL chain: env override → Voyager → Positron */
export function resolveBasemapStyles(): string[] {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  const chain = [custom, CARTO_VOYAGER, CARTO_POSITRON].filter(
    (url): url is string => Boolean(url)
  );
  return [...new Set(chain)];
}
