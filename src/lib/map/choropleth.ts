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
  // Tuned for a dark basemap: the low end stays visible and the high end
  // reads as a luminous "heat" without washing out to a flat block.
  return {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'audienceCount'],
      1,
      ['rgba', r, g, b, 0.16],
      m * 0.2,
      ['rgba', r, g, b, 0.32],
      m * 0.45,
      ['rgba', r, g, b, 0.5],
      m * 0.7,
      ['rgba', r, g, b, 0.68],
      m,
      ['rgba', r, g, b, 0.9],
    ],
    'fill-opacity': 1,
  };
}

export function choroplethLinePaint(rgb: Rgb): LineLayerSpecification['paint'] {
  const [r, g, b] = rgb;
  return {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      `rgb(${r},${g},${b})`,
      'rgba(255, 255, 255, 0.16)',
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
