import { describe, expect, it } from 'vitest';
import {
  buildReachScopeCopy,
  filterRowsBySelectedTypes,
} from './presentation-scope';
import type { AudienceZipRow } from './aggregate';

const rows: AudienceZipRow[] = [
  { zip: '90210', audience_type: 'Hispanic Owners', audience_count: 100 },
  { zip: '90210', audience_type: 'General Market Owners', audience_count: 50 },
  { zip: '10001', audience_type: 'Hispanic Owners', audience_count: 200 },
];

describe('filterRowsBySelectedTypes', () => {
  it('returns only rows for selected segment types', () => {
    const filtered = filterRowsBySelectedTypes(rows, ['Hispanic Owners']);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => r.audience_type === 'Hispanic Owners')).toBe(true);
  });

  it('returns empty when nothing is selected', () => {
    expect(filterRowsBySelectedTypes(rows, [])).toEqual([]);
  });
});

describe('buildReachScopeCopy', () => {
  it('describes the full file when every segment is selected', () => {
    expect(buildReachScopeCopy(12, 12)).toEqual({
      headline: 'Total reach (all segments)',
      segmentPhrase: '12 segments',
    });
  });

  it('describes a partial map selection', () => {
    expect(buildReachScopeCopy(3, 12)).toEqual({
      headline: 'Total reach (selected segments)',
      segmentPhrase: '3 of 12 segments',
    });
  });
});
