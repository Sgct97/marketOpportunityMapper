import { describe, expect, it } from 'vitest';
import {
  competitorMatchesSearchBrand,
  filterPlacesMatchingSearchBrand,
  resolveCompetitorSaveBrand,
} from './filter-competitor-brand';

/** Exact Places-style names from the Fiesta Kia / Hyundai competitor search UI. */
const FIESTA_KIA_HYUNDAI_SEARCH_HITS = [
  { name: 'I-10 Toyota', address: '78980 Varner Rd, Indio, CA 92203, USA' },
  { name: 'Fiesta Ford, Inc.', address: '78990 Varner Rd, Indio, CA 92203, USA' },
  { name: 'Genesis of La Quinta', address: '79025 CA-111, La Quinta, CA 92253, USA' },
  { name: 'Hyundai Of La Quinta', address: '79025 CA-111, La Quinta, CA 92253, USA' },
  { name: 'Genesis of Palm Springs', address: '4057 E Palm Canyon Dr, Palm Springs, CA 92264, USA' },
  { name: 'Hyundai of Palm Springs', address: 'Palm Springs, CA' },
];

describe('competitorMatchesSearchBrand', () => {
  it('rejects cross-OEM neighbors from a Hyundai search (Fiesta Kia case)', () => {
    expect(competitorMatchesSearchBrand('I-10 Toyota', 'hyundai')).toBe(false);
    expect(competitorMatchesSearchBrand('Fiesta Ford, Inc.', 'hyundai')).toBe(false);
    expect(competitorMatchesSearchBrand('Genesis of La Quinta', 'hyundai')).toBe(false);
  });

  it('keeps real Hyundai dealers for a Hyundai search', () => {
    expect(competitorMatchesSearchBrand('Hyundai Of La Quinta', 'hyundai')).toBe(true);
    expect(competitorMatchesSearchBrand('Hyundai of Palm Springs', 'Hyundai')).toBe(true);
  });

  it('keeps Nissan competitors when home brand is Hyundai but search brand is Nissan', () => {
    expect(competitorMatchesSearchBrand('Fontana Nissan Service', 'Nissan')).toBe(true);
    expect(competitorMatchesSearchBrand('Fontana Nissan Service', 'Hyundai')).toBe(false);
  });

  it('keeps places with no detectable OEM name', () => {
    expect(competitorMatchesSearchBrand('Valley Auto Center', 'hyundai')).toBe(true);
  });

  it('rejects empty search brand', () => {
    expect(competitorMatchesSearchBrand('Hyundai Of La Quinta', '   ')).toBe(false);
  });
});

describe('filterPlacesMatchingSearchBrand', () => {
  it('removes the Fiesta Kia Hyundai-search mistakes so they cannot be selected', () => {
    const kept = filterPlacesMatchingSearchBrand(
      FIESTA_KIA_HYUNDAI_SEARCH_HITS,
      'hyundai'
    );

    expect(kept.map(p => p.name)).toEqual([
      'Hyundai Of La Quinta',
      'Hyundai of Palm Springs',
    ]);
    expect(kept.some(p => p.name === 'I-10 Toyota')).toBe(false);
    expect(kept.some(p => /Ford|Toyota|Genesis/i.test(p.name))).toBe(false);
  });

  it('does not strip matching brands when searching Toyota', () => {
    const kept = filterPlacesMatchingSearchBrand(
      [
        { name: 'I-10 Toyota' },
        { name: 'Hyundai Of La Quinta' },
        { name: 'Fiesta Ford, Inc.' },
      ],
      'Toyota'
    );
    expect(kept.map(p => p.name)).toEqual(['I-10 Toyota']);
  });
});

describe('resolveCompetitorSaveBrand', () => {
  it('refuses to stamp Hyundai onto I-10 Toyota at save time', () => {
    expect(resolveCompetitorSaveBrand('I-10 Toyota', 'hyundai')).toBeNull();
    expect(resolveCompetitorSaveBrand('Fiesta Ford, Inc.', 'Hyundai')).toBeNull();
  });

  it('persists canonical Hyundai for matching dealers', () => {
    expect(resolveCompetitorSaveBrand('Hyundai Of La Quinta', 'hyundai')).toBe('Hyundai');
  });

  it('falls back to search brand when the place name has no OEM token', () => {
    expect(resolveCompetitorSaveBrand('Valley Auto Center', 'Nissan')).toBe('Nissan');
  });
});
