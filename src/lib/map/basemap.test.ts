import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARTO_DARK_MATTER,
  CARTO_POSITRON,
  appendCartoApiKey,
  cartoTransformRequest,
  resolveBasemapStyles,
} from './basemap';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('appendCartoApiKey', () => {
  it('appends ?key= to bare Carto style URLs', () => {
    expect(appendCartoApiKey(CARTO_POSITRON, 'test-key')).toBe(
      `${CARTO_POSITRON}?key=test-key`
    );
  });

  it('appends &key= when the URL already has a query string', () => {
    expect(appendCartoApiKey(`${CARTO_POSITRON}?v=1`, 'test-key')).toBe(
      `${CARTO_POSITRON}?v=1&key=test-key`
    );
  });

  it('leaves non-Carto URLs unchanged', () => {
    const other = 'https://example.com/style.json';
    expect(appendCartoApiKey(other, 'test-key')).toBe(other);
  });

  it('does not double-append when key is already present', () => {
    const keyed = `${CARTO_POSITRON}?key=existing`;
    expect(appendCartoApiKey(keyed, 'test-key')).toBe(keyed);
  });

  it('no-ops when the API key is empty', () => {
    expect(appendCartoApiKey(CARTO_POSITRON, '  ')).toBe(CARTO_POSITRON);
    expect(appendCartoApiKey(CARTO_POSITRON, undefined)).toBe(CARTO_POSITRON);
  });

  it('covers raster tile hosts under *.basemaps.cartocdn.com', () => {
    const raster =
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/10/200/400.png';
    expect(appendCartoApiKey(raster, 'test-key')).toBe(`${raster}?key=test-key`);
  });
});

describe('cartoTransformRequest', () => {
  it('returns a MapLibre transformRequest payload with the keyed URL', () => {
    vi.stubEnv('NEXT_PUBLIC_CARTO_API_KEY', 'from-env');
    expect(cartoTransformRequest(CARTO_DARK_MATTER)).toEqual({
      url: `${CARTO_DARK_MATTER}?key=from-env`,
    });
  });
});

describe('resolveBasemapStyles', () => {
  it('keys every Carto style in the theme chain', () => {
    vi.stubEnv('NEXT_PUBLIC_CARTO_API_KEY', 'live-key');
    vi.stubEnv('NEXT_PUBLIC_MAP_STYLE_URL', '');
    const styles = resolveBasemapStyles('light');
    expect(styles.every(u => u.includes('key=live-key'))).toBe(true);
    expect(styles[0]).toContain('positron');
  });
});
