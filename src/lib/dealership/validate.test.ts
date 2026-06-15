import { describe, expect, it } from 'vitest';
import { clientDealerships, competitorDealerships, filterDealerships, isDuplicateOfClient, mappableDealerships } from './filter';
import type { DealershipRow } from './types';
import { validateDealershipRows } from './validate';

const baseRow: DealershipRow = {
  id: '1',
  name: 'ABC Hyundai',
  brand: 'Hyundai',
  role: 'client',
  latitude: 34.0,
  longitude: -118.0,
  address: null,
  geocode_status: 'ok',
};

describe('validateDealershipRows', () => {
  it('imports rows with lat/lng', () => {
    const { records, summary } = validateDealershipRows(
      [
        {
          'Dealership Name': 'ABC Hyundai',
          Brand: 'Hyundai',
          Role: 'client',
          Latitude: '34.05',
          Longitude: '-118.25',
        },
      ],
      'dealers.csv'
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.geocodeStatus).toBe('ok');
    expect(summary.mappableCount).toBe(1);
  });

  it('accepts address-only as pending geocode', () => {
    const { records, summary } = validateDealershipRows(
      [
        {
          'Dealership Name': 'XYZ Toyota',
          Brand: 'Toyota',
          Role: 'competitor',
          Address: '123 Main St, Dallas TX',
        },
      ],
      'dealers.csv'
    );
    expect(records[0]?.geocodeStatus).toBe('pending');
    expect(summary.pendingGeocodeCount).toBe(1);
    expect(summary.mappableCount).toBe(0);
  });

  it('normalizes role aliases', () => {
    const { records } = validateDealershipRows(
      [
        {
          Name: 'Our Store',
          Brand: 'Hyundai',
          Type: 'dealer',
          Lat: '33',
          Lng: '-117',
        },
        {
          Name: 'Rival',
          Brand: 'Hyundai',
          Type: 'comp',
          Lat: '33.1',
          Lng: '-117.1',
        },
      ],
      'dealers.csv'
    );
    expect(records[0]?.role).toBe('client');
    expect(records[1]?.role).toBe('competitor');
  });

  it('rejects row without coordinates or address', () => {
    const { records, summary } = validateDealershipRows(
      [
        {
          'Dealership Name': 'Bad Row',
          Brand: 'Hyundai',
          Role: 'client',
        },
      ],
      'dealers.csv'
    );
    expect(records).toHaveLength(0);
    expect(summary.invalidRows).toBe(1);
  });
});

describe('filterDealerships', () => {
  const rows: DealershipRow[] = [
    baseRow,
    {
      ...baseRow,
      id: '2',
      name: 'Pending',
      geocode_status: 'pending',
      latitude: null,
      longitude: null,
      address: '123 Main',
    },
    {
      ...baseRow,
      id: '3',
      name: 'Comp Kia',
      brand: 'Kia',
      role: 'competitor',
    },
  ];

  it('filters by brand and mappable only', () => {
    const result = filterDealerships(rows, { brands: ['Hyundai'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('ABC Hyundai');
  });

  it('lists mappable client dealers', () => {
    expect(mappableDealerships(rows)).toHaveLength(2);
    expect(clientDealerships(rows)).toHaveLength(1);
    expect(competitorDealerships(rows)).toHaveLength(1);
    expect(competitorDealerships(rows)[0]?.name).toBe('Comp Kia');
  });

  it('excludes client duplicate from competitor list', () => {
    const client = clientDealerships(rows)[0]!;
    const duplicateCompetitor = {
      ...rows[1]!,
      id: 'dup',
      name: 'ABC Hyundai',
      role: 'competitor' as const,
      latitude: client.latitude,
      longitude: client.longitude,
    };
    const all = [...rows, duplicateCompetitor];
    expect(competitorDealerships(all, client)).toHaveLength(1);
    expect(isDuplicateOfClient(duplicateCompetitor, client)).toBe(true);
  });
});
