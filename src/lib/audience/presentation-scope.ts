import type { AudienceZipRow } from '@/lib/audience/aggregate';

/** Rows that match the map's active segment selection. */
export function filterRowsBySelectedTypes(
  rows: AudienceZipRow[],
  selectedTypes: readonly string[]
): AudienceZipRow[] {
  if (selectedTypes.length === 0) return [];
  const typeSet = new Set(selectedTypes);
  return rows.filter(row => typeSet.has(row.audience_type));
}

export interface ReachScopeCopy {
  headline: string;
  segmentPhrase: string;
}

/** Headline + meta copy for dashboard and PDF reach hero. */
export function buildReachScopeCopy(
  selectedCount: number,
  totalCount: number
): ReachScopeCopy {
  if (selectedCount === 0) {
    return { headline: 'Total reach', segmentPhrase: 'No segments selected' };
  }

  if (selectedCount === totalCount) {
    return {
      headline: 'Total reach (all segments)',
      segmentPhrase: `${totalCount} segment${totalCount === 1 ? '' : 's'}`,
    };
  }

  if (selectedCount === 1) {
    return {
      headline: 'Total reach (1 segment)',
      segmentPhrase: `1 of ${totalCount} segments`,
    };
  }

  return {
    headline: 'Total reach (selected segments)',
    segmentPhrase: `${selectedCount} of ${totalCount} segments`,
  };
}
