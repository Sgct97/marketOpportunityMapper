import type maplibregl from 'maplibre-gl';

export const CLIENT_STAR_IMAGE_ID = 'mom-client-star';

const ICON_SIZE = 64;

function traceStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number
) {
  const points = 5;
  const step = Math.PI / points;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Crisp five-point star with a white rim for contrast on any basemap. */
export function renderClientStarImage(color: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;
  const outer = ICON_SIZE * 0.36;
  const inner = outer * 0.44;

  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);

  traceStar(ctx, cx, cy, outer, inner);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = ICON_SIZE * 0.09;
  ctx.lineJoin = 'round';
  ctx.stroke();

  traceStar(ctx, cx, cy, outer * 0.96, inner * 0.96);
  ctx.fillStyle = color;
  ctx.fill();

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

/** Register (or refresh) the home-dealership star used by the client symbol layer. */
export function ensureClientStarImage(map: maplibregl.Map, color: string) {
  const image = renderClientStarImage(color);
  if (map.hasImage(CLIENT_STAR_IMAGE_ID)) {
    map.updateImage(CLIENT_STAR_IMAGE_ID, image);
  } else {
    map.addImage(CLIENT_STAR_IMAGE_ID, image, { pixelRatio: 2 });
  }
}
