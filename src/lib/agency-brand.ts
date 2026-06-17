/**
 * Agency letterhead for exported reports — separate from the OEM accent used
 * in the live presentation UI. Config mirrors lookerStudioDashboard brands.
 */
export interface AgencyBrandConfig {
  id: string;
  name: string;
  /** Public path, e.g. `/logo.png`. */
  logo: string;
  /** Intrinsic logo aspect ratio (width / height) for correct PDF scaling. */
  logoAspect: number;
  /** Image format of the logo file, for jsPDF `addImage`. */
  logoFormat: 'PNG' | 'JPEG';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  headerBackgroundColor?: string;
}

export const agencyBrands: Record<string, AgencyBrandConfig> = {
  'dealer-media-house': {
    id: 'dealer-media-house',
    name: 'Dealer Media House',
    logo: '/logo.png',
    logoAspect: 746 / 208,
    logoFormat: 'PNG',
    primaryColor: '#4BA5A5',
    secondaryColor: '#5A5A5A',
    textColor: '#333333',
  },
  'dealers-direct-us': {
    id: 'dealers-direct-us',
    name: 'Dealers Direct U.S.',
    logo: '/ddus-logo.png',
    logoAspect: 1024 / 248,
    logoFormat: 'JPEG',
    primaryColor: '#C91F2C',
    secondaryColor: '#1D3F8F',
    textColor: '#1A202C',
    headerBackgroundColor: '#101827',
  },
};

export const defaultAgencyBrand = agencyBrands['dealer-media-house']!;

export function getAgencyBrand(brandId?: string | null): AgencyBrandConfig {
  if (brandId && agencyBrands[brandId]) return agencyBrands[brandId]!;
  return defaultAgencyBrand;
}

function mimeFor(logoPath: string): string {
  return /\.jpe?g$/i.test(logoPath) ? 'image/jpeg' : 'image/png';
}

/** Load a public logo as a data URL (browser fetch or Node fs in tests). */
export async function loadLogoDataUrl(logoPath: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const file = join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
      const buf = readFileSync(file);
      return `data:${mimeFor(logoPath)};base64,${buf.toString('base64')}`;
    }
    const res = await fetch(logoPath);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
