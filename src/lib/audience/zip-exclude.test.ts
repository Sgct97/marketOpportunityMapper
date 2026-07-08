import { describe, expect, it } from 'vitest';
import {
  filterRowsByExcludedZips,
  parseExcludedZips,
  segmentMetricsForZip,
  toggleExcludedZip,
} from './zip-exclude';

const rows = [
  { zip: '90210', audience_type: 'SUV', audience_count: 100 },
  { zip: '90210', audience_type: 'Sedan', audience_count: 50 },
  { zip: '10001', audience_type: 'SUV', audience_count: 200 },
];

describe('zip-exclude', () => {
  it('parses and dedupes excluded ZIPs', () => {
    expect(parseExcludedZips(['90210', '90210', 'bad', '10001'])).toEqual(['10001', '90210']);
  });

  it('filters rows by excluded ZIPs', () => {
    const filtered = filterRowsByExcludedZips(rows, ['90210']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.zip).toBe('10001');
  });

  it('toggles ZIP membership', () => {
    expect(toggleExcludedZip([], '90210')).toEqual(['90210']);
    expect(toggleExcludedZip(['90210'], '90210')).toEqual([]);
    expect(toggleExcludedZip(['90210'], '10001')).toEqual(['10001', '90210']);
  });

  it('builds per-segment metrics for a ZIP', () => {
    expect(segmentMetricsForZip(rows, '90210')).toEqual([
      { name: 'SUV', count: 100 },
      { name: 'Sedan', count: 50 },
    ]);
  });
});
