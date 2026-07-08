import { distanceMiles } from '@/lib/map/radius';
import {
  clientDealerships,
  competitorDealerships,
} from '@/lib/dealership/filter';
import type { DealershipRow } from './types';

export interface RankedCompetitor extends DealershipRow {
  rank: number;
  distanceMiles: number | null;
}

/** Nearest competitor to the focus client is #1; name breaks ties. */
export function rankCompetitors(
  competitors: DealershipRow[],
  focus: DealershipRow | null
): RankedCompetitor[] {
  const withDistance = competitors.map(dealer => {
    let distance: number | null = null;
    if (
      focus?.latitude != null &&
      focus?.longitude != null &&
      dealer.latitude != null &&
      dealer.longitude != null
    ) {
      distance = distanceMiles(
        focus.latitude,
        focus.longitude,
        dealer.latitude,
        dealer.longitude
      );
    }
    return { dealer, distance };
  });

  withDistance.sort((a, b) => {
    if (a.distance != null && b.distance != null && a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    if (a.distance != null && b.distance == null) return -1;
    if (a.distance == null && b.distance != null) return 1;
    return a.dealer.name.localeCompare(b.dealer.name);
  });

  return withDistance.map((item, index) => ({
    ...item.dealer,
    rank: index + 1,
    distanceMiles: item.distance,
  }));
}

/** Shared ranking for map pins and the on-map legend. */
export function rankedCompetitorsForProject(
  dealers: DealershipRow[],
  focusDealershipId: string | null
): RankedCompetitor[] {
  const clients = clientDealerships(dealers);
  const focus =
    clients.find(d => d.id === focusDealershipId) ?? clients[0] ?? null;
  const competitors = competitorDealerships(dealers, focus);
  return rankCompetitors(competitors, focus);
}
