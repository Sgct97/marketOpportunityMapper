import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

export type Rgb = [number, number, number];

/** Multi-stop fill ramp tuned for presentation maps (subtle low end, rich high end). */
export function choroplethFillPaint(
  rgb: Rgb,
  maxCount: number
): FillLayerSpecification['paint'] {
  const [r, g, b] = rgb;
  if (maxCount <= 0) {
    return {
      'fill-color': `rgb(${r},${g},${b})`,
      'fill-opacity': 0.28,
    };
  }

  const m = maxCount;
  // The choropleth renders BENEATH the basemap labels, so place names stay
  // legible. Alphas are kept moderate so roads/geography still read through
  // the heat instead of flattening into a solid block.
  return {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'audienceCount'],
      1,
      ['rgba', r, g, b, 0.12],
      m * 0.2,
      ['rgba', r, g, b, 0.26],
      m * 0.45,
      ['rgba', r, g, b, 0.42],
      m * 0.7,
      ['rgba', r, g, b, 0.58],
      m,
      ['rgba', r, g, b, 0.74],
    ],
    'fill-opacity': 1,
  };
}

export function choroplethLinePaint(
  rgb: Rgb,
  theme: 'dark' | 'light' = 'dark'
): LineLayerSpecification['paint'] {
  const [r, g, b] = rgb;
  const restColor =
    theme === 'light' ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.16)';
  return {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      `rgb(${r},${g},${b})`,
      restColor,
    ],
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      2.5,
      0.7,
    ],
    'line-opacity': 1,
  };
}
