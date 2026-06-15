import { describe, expect, it } from 'vitest';
import {
  detectBrand,
  inferClientFromAudienceFilename,
  normalizeWebsiteUrl,
  websiteDomain,
} from './infer-client';

describe('inferClientFromAudienceFilename', () => {
  it('parses Hyundai Glendora export', () => {
    const r = inferClientFromAudienceFilename('Hyundai Glendora April.xlsx');
    expect(r.suggestedName).toBe('Hyundai Glendora');
    expect(r.brand).toBe('Hyundai');
  });

  it('parses Penn Toyota export', () => {
    const r = inferClientFromAudienceFilename('Penn Toyota_APRIL.xlsx');
    expect(r.suggestedName).toContain('Penn Toyota');
    expect(r.brand).toBe('Toyota');
  });
});

describe('normalizeWebsiteUrl', () => {
  it('adds https scheme', () => {
    expect(normalizeWebsiteUrl('www.example.com')).toBe('https://www.example.com');
  });
});

describe('websiteDomain', () => {
  it('strips www', () => {
    expect(websiteDomain('https://www.hyundaiofglendora.com')).toBe('hyundaiofglendora.com');
  });
});

describe('detectBrand', () => {
  it('finds Kia in text', () => {
    expect(detectBrand('KIA of Dallas')).toBe('Kia');
  });
});
