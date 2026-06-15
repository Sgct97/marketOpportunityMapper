/** Parse #RRGGBB to rgb components. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const normalized = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const bigint = parseInt(normalized, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/** Choropleth fill from intensity 0–1 (legend swatches; map uses MapLibre expressions). */
export function fillColor(rgb: [number, number, number], intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  const alpha = 0.1 + t * 0.68;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export function outlineColor(rgb: [number, number, number]): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`;
}
