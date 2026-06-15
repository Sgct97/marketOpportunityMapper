const MONTH_TOKENS =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;

const OEM_BRANDS = [
  'Acura',
  'Audi',
  'BMW',
  'Buick',
  'Cadillac',
  'Chevrolet',
  'Chrysler',
  'Dodge',
  'Ford',
  'Genesis',
  'GMC',
  'Honda',
  'Hyundai',
  'Infiniti',
  'Jeep',
  'Kia',
  'Lexus',
  'Lincoln',
  'Mazda',
  'Mercedes',
  'Mercedes-Benz',
  'Mitsubishi',
  'Nissan',
  'Ram',
  'Subaru',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

export interface InferredClientDealer {
  suggestedName: string;
  brand: string | null;
}

export function inferClientFromAudienceFilename(fileName: string): InferredClientDealer {
  let base = fileName.replace(/\.(csv|xlsx|xls)$/i, '').trim();
  base = base.replace(/[_]+/g, ' ');
  base = base.replace(MONTH_TOKENS, ' ');
  base = base.replace(/\s+/g, ' ').trim();

  const brand = detectBrand(base);
  return { suggestedName: base, brand };
}

export function detectBrand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const brand of OEM_BRANDS) {
    if (lower.includes(brand.toLowerCase())) {
      return brand === 'Mercedes' ? 'Mercedes-Benz' : brand;
    }
  }
  return null;
}

export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function websiteDomain(url: string): string {
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}
