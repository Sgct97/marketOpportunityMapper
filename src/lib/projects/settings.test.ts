import { describe, expect, it } from 'vitest';
import {
  RADIUS_MILES_OPTIONS,
  defaultMapSettings,
  parseProjectMapSettings,
} from './settings';

describe('RADIUS_MILES_OPTIONS', () => {
  it('lists the supported trade-area radii', () => {
    expect(RADIUS_MILES_OPTIONS).toEqual([10, 15, 20, 25]);
  });
});

describe('parseProjectMapSettings', () => {
  it('accepts each supported radius', () => {
    for (const radiusMiles of RADIUS_MILES_OPTIONS) {
      expect(parseProjectMapSettings({ radiusMiles }).radiusMiles).toBe(radiusMiles);
    }
  });

  it('defaults unknown radius values to 25 mi', () => {
    expect(parseProjectMapSettings({ radiusMiles: 50 }).radiusMiles).toBe(25);
    expect(parseProjectMapSettings({ radiusMiles: 99 }).radiusMiles).toBe(25);
  });

  it('defaults missing radius to 25 mi', () => {
    expect(parseProjectMapSettings({}).radiusMiles).toBe(25);
    expect(defaultMapSettings().radiusMiles).toBe(25);
  });
});
