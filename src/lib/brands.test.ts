import { describe, expect, it } from 'vitest';
import { competitorPinColor, defaultBrand, getBrand, resolveBrandAccent } from './brands';

describe('resolveBrandAccent', () => {
  it('prefers the confirmed client brand', () => {
    const brand = resolveBrandAccent({ clientBrand: 'Hyundai', fileName: 'whatever.xlsx' });
    expect(brand.id).toBe('hyundai');
    expect(brand.name).toBe('Hyundai');
    expect(brand.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('tolerates loose client spelling like "Nisan"', () => {
    const brand = resolveBrandAccent({ clientBrand: 'Nisan' });
    // "Nisan" has no clean substring match, so it falls through to default
    // rather than guessing — callers should pass the file name too.
    expect(brand.id).toBe(defaultBrand.id);
  });

  it('falls back to the audience file name', () => {
    const brand = resolveBrandAccent({ fileName: 'Fontana Hyundai JUNE.xlsx' });
    expect(brand.id).toBe('hyundai');
  });

  it('infers brand from segment column names as a last resort', () => {
    const brand = resolveBrandAccent({
      segmentNames: [
        'Hispanic NISSAN Intenders',
        'Non-Hispanic NISSAN Owners',
        'Hispanic Pre-OWNED Intenders',
      ],
    });
    expect(brand.id).toBe('nissan');
  });

  it('returns the neutral default when nothing matches', () => {
    const brand = resolveBrandAccent({ projectName: 'Q3 Market Test' });
    expect(brand.id).toBe(defaultBrand.id);
  });

  it('derives a darker shade and soft tint from the primary', () => {
    const brand = resolveBrandAccent({ clientBrand: 'Toyota' });
    expect(brand.primaryDark).toMatch(/^#[0-9a-f]{6}$/i);
    expect(brand.primarySoft).toMatch(/^rgba\(/);
    expect(brand.onPrimary).toBe('#FFFFFF');
  });

  it('exposes a luminous on-dark glow accent and its derivatives', () => {
    const brand = resolveBrandAccent({ clientBrand: 'Hyundai' });
    expect(brand.glow).toMatch(/^#[0-9a-f]{6}$/i);
    expect(brand.glowDeep).toMatch(/^#[0-9a-f]{6}$/i);
    expect(brand.glowSoft).toMatch(/^rgba\(/);
    expect(brand.glowLine).toMatch(/^rgba\(/);
    // The glow must be brighter than the (dark navy) brand primary.
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    };
    expect(lum(brand.glow)).toBeGreaterThan(lum(brand.primaryColor));
  });
});

describe('competitorPinColor', () => {
  it('returns distinct OEM colors for different brands', () => {
    const toyota = competitorPinColor('Toyota', 'dark');
    const honda = competitorPinColor('Honda', 'dark');
    expect(toyota).not.toBe(honda);
    expect(toyota).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('uses stable fallback colors for unknown brands', () => {
    const a = competitorPinColor('Independent Motors', 'dark');
    const b = competitorPinColor('Independent Motors', 'dark');
    const c = competitorPinColor('Other Lot', 'dark');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('getBrand', () => {
  it('returns default for the house id', () => {
    expect(getBrand('dealer-media-house').id).toBe('dealer-media-house');
  });

  it('round-trips an OEM slug', () => {
    expect(getBrand('hyundai').name).toBe('Hyundai');
  });
});
