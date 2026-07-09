import { describe, expect, it } from 'vitest';
import {
  buildZipLabelMap,
  formatZipDisplay,
  formatZipDisplayTitle,
  lookupUspsZipLabel,
} from './zip-labels';

describe('zip-labels', () => {
  it('returns USPS primary city for a known ZIP', () => {
    expect(lookupUspsZipLabel('90210')).toEqual({
      zip: '90210',
      city: 'Beverly Hills',
      state: 'CA',
    });
  });

  it('builds a lookup map for project ZIPs', () => {
    const map = buildZipLabelMap(['90210', '10001', 'bad']);
    expect(map['90210']?.city).toBe('Beverly Hills');
    expect(map['10001']?.city).toBe('New York');
    expect(map.bad).toBeUndefined();
  });

  it('formats display and title strings', () => {
    const map = buildZipLabelMap(['33176']);
    expect(formatZipDisplay('33176', map)).toBe('33176 · Miami');
    expect(formatZipDisplayTitle('33176', map)).toBe('33176 · Miami, FL');
    expect(formatZipDisplay('99999', map)).toBe('99999');
  });
});
