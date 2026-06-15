export interface BrandConfig {
  id: string;
  name: string;
  primaryColor: string;
  textColor: string;
}

export const defaultBrand: BrandConfig = {
  id: 'dealer-media-house',
  name: 'Dealer Media House',
  primaryColor: '#4BA5A5',
  textColor: '#1A202C',
};

export function getBrand(brandId?: string): BrandConfig {
  if (brandId === defaultBrand.id) return defaultBrand;
  return defaultBrand;
}
