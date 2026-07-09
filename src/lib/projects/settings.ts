import { parseExcludedZips } from '@/lib/audience/zip-exclude';

export const RADIUS_MILES_OPTIONS = [10, 15, 20, 25] as const;
export type RadiusMiles = (typeof RADIUS_MILES_OPTIONS)[number];

/** Which palette drives the map, dashboard, and exported report. */
export type AccentSource = 'vehicle' | 'agency';

export interface ProjectMapSettings {
  focusDealershipId?: string | null;
  radiusMiles?: RadiusMiles;
  /** `vehicle` = OEM brand accent; `agency` = agency brand colors. */
  accentSource?: AccentSource;
  showZipLayer?: boolean;
  showClientDealershipLayer?: boolean;
  showCompetitorLayer?: boolean;
  /** @deprecated use showClientDealershipLayer / showCompetitorLayer */
  showDealershipLayer?: boolean;
  showRadiusLayer?: boolean;
  /** ZIP codes removed from trade-area metrics and map emphasis (persisted). */
  excludedZips?: string[];
  clientDealerWebsite?: string | null;
  suggestedDealerName?: string | null;
  competitorBrand?: string | null;
}

function legacyDealershipLayersVisible(s: Record<string, unknown>): boolean {
  return s.showDealershipLayer !== false;
}

export function parseProjectMapSettings(raw: unknown): ProjectMapSettings {
  if (!raw || typeof raw !== 'object') return {};
  const s = raw as Record<string, unknown>;

  const radius = Number(s.radiusMiles);
  const radiusMiles = RADIUS_MILES_OPTIONS.includes(radius as RadiusMiles)
    ? (radius as RadiusMiles)
    : undefined;

  const legacyLayers = legacyDealershipLayersVisible(s);

  return {
    focusDealershipId:
      typeof s.focusDealershipId === 'string' ? s.focusDealershipId : undefined,
    radiusMiles: radiusMiles ?? 25,
    accentSource: s.accentSource === 'agency' ? 'agency' : 'vehicle',
    showZipLayer: s.showZipLayer !== false,
    showClientDealershipLayer:
      s.showClientDealershipLayer !== undefined
        ? s.showClientDealershipLayer !== false
        : legacyLayers,
    showCompetitorLayer:
      s.showCompetitorLayer !== undefined ? s.showCompetitorLayer !== false : legacyLayers,
    showRadiusLayer: s.showRadiusLayer !== false,
    excludedZips: parseExcludedZips(s.excludedZips),
    clientDealerWebsite:
      typeof s.clientDealerWebsite === 'string' ? s.clientDealerWebsite : undefined,
    suggestedDealerName:
      typeof s.suggestedDealerName === 'string' ? s.suggestedDealerName : undefined,
    competitorBrand: typeof s.competitorBrand === 'string' ? s.competitorBrand : undefined,
  };
}

export function defaultMapSettings(
  focusDealershipId?: string | null
): ProjectMapSettings {
  return {
    focusDealershipId: focusDealershipId ?? null,
    radiusMiles: 25,
    showZipLayer: true,
    showClientDealershipLayer: true,
    showCompetitorLayer: true,
    showRadiusLayer: true,
    excludedZips: [],
  };
}
