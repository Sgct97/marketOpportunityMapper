import { describe, expect, it } from 'vitest';
import { defaultAgencyBrand, getAgencyBrand, loadLogoDataUrl } from './agency-brand';

describe('getAgencyBrand', () => {
  it('returns Dealer Media House by default', () => {
    expect(getAgencyBrand().id).toBe('dealer-media-house');
    expect(getAgencyBrand(undefined).name).toBe('Dealer Media House');
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
