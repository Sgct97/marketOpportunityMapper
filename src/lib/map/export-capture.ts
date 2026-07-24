import type { Map as MapLibreMap } from 'maplibre-gl';
import { circlePolygonCoordinates } from '@/lib/map/radius';

export interface MapImage {
  dataUrl: string;
  /** Pixel dimensions of the captured canvas (for aspect-ratio fitting). */
  width: number;
  height: number;
}

export interface FocusPoint {
  longitude: number;
  latitude: number;
}

export interface RadiusBounds {
  sw: [number, number];
  ne: [number, number];
}

/** Geographic bounding box that fully contains a straight-line radius circle. */
export function boundsFromRadius(
  longitude: number,
  latitude: number,
  radiusMiles: number
): RadiusBounds {
  const ring = circlePolygonCoordinates(longitude, latitude, radiusMiles);
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return { sw: [minLng, minLat], ne: [maxLng, maxLat] };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Resolve when the map goes idle, or after `timeoutMs` (whichever comes first). */
function waitForMapIdle(map: MapLibreMap, timeoutMs = 4000): Promise<void> {
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    map.once('idle', finish);
  });
}

function waitFrames(count = 2): Promise<void> {
  return new Promise(resolve => {
    let remaining = count;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function frameToRadius(
  map: MapLibreMap,
  focus: FocusPoint,
  radiusMiles: number
): Promise<void> {
  const { sw, ne } = boundsFromRadius(focus.longitude, focus.latitude, radiusMiles);
  // Register the idle waiter BEFORE fitBounds — otherwise a synchronous idle
  // event can fire before the listener is attached and hang forever.
  const settled = waitForMapIdle(map, 4000);
  map.fitBounds([sw, ne], { padding: 52, duration: 0, animate: false });
  await settled;
  await waitFrames(2);
}

/**
 * Snapshot the live map canvas as currently framed — no camera moves.
 * Used for the dashboard hero preview so it matches what the presenter sees.
 */
export function captureMapPreview(map: MapLibreMap | null): MapImage | null {
  if (!map) return null;
  try {
    const canvas = map.getCanvas();
    if (!canvas.width || !canvas.height) return null;
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
}

/**
 * Capture the map for PNG/PDF export. When a focus dealership is set, the
 * viewport is temporarily framed to show the full straight-line radius ring
 * (matching the selected miles in map controls), then restored afterward so
 * the live presentation view is unchanged.
 */
export async function captureMapForExport(
  map: MapLibreMap | null,
  focus: FocusPoint | null,
  radiusMiles: number
): Promise<MapImage | null> {
  if (!map) return null;

  const prev = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };

  try {
    map.resize();

    if (focus) {
      if (!map.loaded() || !map.isStyleLoaded()) {
        await Promise.race([
          new Promise<void>(resolve => map.once('load', () => resolve())),
          delay(4000),
        ]);
      }
      await frameToRadius(map, focus, radiusMiles);
    } else {
      await waitFrames(2);
    }

    const canvas = map.getCanvas();
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  } finally {
    map.jumpTo({
      center: prev.center,
      zoom: prev.zoom,
      bearing: prev.bearing,
      pitch: prev.pitch,
    });
  }
}
