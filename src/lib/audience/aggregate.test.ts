import { describe, expect, it } from 'vitest';
import { aggregateAudienceByZip, listAudienceTypes } from './aggregate';

const rows = [
  { zip: '75067', audience_type: 'Nissan Owners', audience_count: 100 },
  { zip: '75067', audience_type: 'EV Shoppers', audience_count: 50 },
  { zip: '75068', audience_type: 'Nissan Owners', audience_count: 200 },
];

describe('aggregateAudienceByZip', () => {
  it('sums one type per zip', () => {
    const r = aggregateAudienceByZip(rows, ['Nissan Owners']);
    expect(r.byZip['75067']).toBe(100);
    expect(r.byZip['75068']).toBe(200);
    expect(r.totalAudience).toBe(300);
    expect(r.maxCount).toBe(200);
  });

  it('sums multiple types per zip', () => {
    const r = aggregateAudienceByZip(rows, ['Nissan Owners', 'EV Shoppers']);
    expect(r.byZip['75067']).toBe(150);
    expect(r.zips).toHaveLength(2);
  });

  it('returns empty when no types selected', () => {
    const r = aggregateAudienceByZip(rows, []);
    expect(r.zips).toHaveLength(0);
    expect(r.totalAudience).toBe(0);
  });
});

describe('listAudienceTypes', () => {
  it('returns unique sorted types', () => {
    expect(listAudienceTypes(rows)).toEqual(['EV Shoppers', 'Nissan Owners']);
  });
});
