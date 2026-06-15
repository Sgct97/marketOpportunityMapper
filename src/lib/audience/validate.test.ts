import { describe, expect, it } from 'vitest';
import { normalizeAudienceType, normalizeZip, validateAudienceRows } from './validate';

describe('normalizeZip', () => {
  it('extracts five digits', () => {
    expect(normalizeZip('75067')).toBe('75067');
    expect(normalizeZip(90632)).toBe('90632');
    expect(normalizeZip('ZIP 75067-1234')).toBe('75067');
  });

  it('returns null for invalid', () => {
    expect(normalizeZip('')).toBeNull();
    expect(normalizeZip('abc')).toBeNull();
  });
});

describe('normalizeAudienceType', () => {
  it('strips bullet prefix', () => {
    expect(normalizeAudienceType('•Hispanic HYUNDAI Intenders')).toBe(
      'Hispanic HYUNDAI Intenders'
    );
  });
});

describe('validateAudienceRows — long format', () => {
  const validRow = {
    'ZIP Code': '75067',
    'Audience Type': 'Nissan Owners',
    'Audience Count': '100',
  };

  it('imports valid rows', () => {
    const { records, summary } = validateAudienceRows([validRow], 'test.csv');
    expect(records).toHaveLength(1);
    expect(summary.format).toBe('long');
    expect(records[0]?.audienceCount).toBe(100);
  });

  it('aggregates duplicate zip + type', () => {
    const { records } = validateAudienceRows(
      [validRow, { ...validRow, 'Audience Count': '50' }],
      'test.csv'
    );
    expect(records[0]!.audienceCount).toBe(150);
  });
});

describe('validateAudienceRows — wide format', () => {
  const hyundaiRow = {
    ZIP: '90632',
    STATE: 'CA',
    COUNTY: 'Orange',
    CITY: 'La Habra',
    '•Hispanic HYUNDAI Intenders': '4',
    '•Hispanic HYUNDAI Owners': '8',
    '•KIA Intenders': '0',
  };

  it('unpivots segment columns', () => {
    const { records, summary } = validateAudienceRows([hyundaiRow], 'hyundai.xlsx');
    expect(summary.format).toBe('wide');
    expect(summary.zips).toEqual(['90632']);
    expect(summary.audienceTypes).toContain('Hispanic HYUNDAI Intenders');
    expect(summary.audienceTypes).toContain('Hispanic HYUNDAI Owners');
    expect(records).toHaveLength(2);
    expect(summary.totalAudience).toBe(12);
  });

  it('accepts ZIPS column (Penn Toyota style)', () => {
    const { summary } = validateAudienceRows(
      [
        {
          ZIPS: '11548',
          STATES: 'NY',
          RADIUS: '0',
          '•Hispanic TOYOTA Intenders': '8',
        },
      ],
      'penn.xlsx'
    );
    expect(summary.format).toBe('wide');
    expect(summary.zips).toEqual(['11548']);
    expect(summary.rowsImported).toBe(1);
  });

  it('skips zero counts in wide format', () => {
    const { records } = validateAudienceRows([hyundaiRow], 'hyundai.xlsx');
    expect(records.find(r => r.audienceType.includes('KIA'))).toBeUndefined();
  });
});
