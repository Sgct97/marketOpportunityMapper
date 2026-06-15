export const RADIUS_MILES_OPTIONS = [10, 25, 50] as const;
export type RadiusMiles = (typeof RADIUS_MILES_OPTIONS)[number];

export interface ProjectMapSettings {
  focusDealershipId?: string | null;
  radiusMiles?: RadiusMiles;
  showZipLayer?: boolean;
  showDealershipLayer?: boolean;
  showRadiusLayer?: boolean;
}

export function parseProjectMapSettings(raw: unknown): ProjectMapSettings {
  if (!raw || typeof raw !== 'object') return {};
  const s = raw as Record<string, unknown>;

  const radius = Number(s.radiusMiles);
  const radiusMiles = RADIUS_MILES_OPTIONS.includes(radius as RadiusMiles)
    ? (radius as RadiusMiles)
    : undefined;

  return {
    focusDealershipId:
      typeof s.focusDealershipId === 'string' ? s.focusDealershipId : undefined,
    radiusMiles: radiusMiles ?? 25,
    showZipLayer: s.showZipLayer !== false,
    showDealershipLayer: s.showDealershipLayer !== false,
    showRadiusLayer: s.showRadiusLayer !== false,
  };
}

export function defaultMapSettings(
  focusDealershipId?: string | null
): ProjectMapSettings {
  return {
    focusDealershipId: focusDealershipId ?? null,
    radiusMiles: 25,
    showZipLayer: true,
    showDealershipLayer: true,
    showRadiusLayer: true,
  };
}
