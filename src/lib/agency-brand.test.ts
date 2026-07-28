import { describe, expect, it } from 'vitest';
import { defaultAgencyBrand, getAgencyBrand, loadLogoDataUrl } from './agency-brand';

describe('getAgencyBrand', () => {
  it('returns Dealer Media House by default', () => {
    expect(getAgencyBrand().id).toBe('dealer-media-house');
    expect(getAgencyBrand(undefined).name).toBe('Dealer Media House');
  });

  it('uses Brittany DMH brand palette', () => {
    const dmh = getAgencyBrand('dealer-media-house');
    expect(dmh.primaryColor.toLowerCase()).toBe('#003c46');
    expect(dmh.glow.toLowerCase()).toBe('#00afaf');
    expect(dmh.secondaryColor.toLowerCase()).toBe('#00afaf');
    expect(dmh.textColor.toLowerCase()).toBe('#21231f');
    expect(dmh.headerBackgroundColor?.toLowerCase()).toBe('#003c46');
    expect(dmh.headerAccentColor?.toLowerCase()).toBe('#00afaf');
    expect(dmh.logo).toBe('/dmh-logo-light.png');
    expect(dmh.highlightColor?.toLowerCase()).toBe('#ffff00');
    expect(dmh.tertiaryColor?.toLowerCase()).toBe('#21231f');
  });

  it('resolves known agency ids', () => {
    expect(getAgencyBrand('dealers-direct-us').logo).toBe('/ddus-logo.png');
  });

  it('falls back for unknown ids', () => {
    expect(getAgencyBrand('unknown').id).toBe(defaultAgencyBrand.id);
  });
});

describe('loadLogoDataUrl', () => {
  it('loads the default agency logo from public/', async () => {
    const dataUrl = await loadLogoDataUrl(defaultAgencyBrand.logo);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
