import { detectBrand } from '@/lib/dealership/infer-client';

/**
 * Brand accent system.
 *
 * The presentation UI is accent-driven: a single primary color flows through
 * the header, dashboard, choropleth, and dealership pins. For automotive
 * pitches we map the client's OEM (Hyundai, Nissan, …) to a tasteful accent so
 * the room feels like that brand's analytics product. Everything falls back to
 * the neutral Dealer Media House teal when no brand can be resolved.
 */
export interface BrandConfig {
  /** Stable identifier (OEM slug or `dealer-media-house`). */
  id: string;
  /** Human label shown in the brand chip. */
  name: string;
  /** Primary accent — the true brand hex (logos, solid chips). */
  primaryColor: string;
  /** Darker shade for gradients / hover (hex). */
  primaryDark: string;
  /** Soft tint for fills / chip backgrounds (rgba string). */
  primarySoft: string;
  /**
   * Luminous, on-dark accent. The presentation surface is dark, so most brand
   * hues (Hyundai navy, Subaru blue …) would vanish. `glow` is the brightened,
   * saturated version used for text, bars, charts, choropleth, and pins.
   */
  glow: string;
  /** Slightly deeper glow for the dark end of gradients (hex). */
  glowDeep: string;
  /** Translucent glow for fills / tints (rgba string). */
  glowSoft: string;
  /** Translucent glow for hairline borders (rgba string). */
  glowLine: string;
  /** Readable foreground used on neutral surfaces (hex). */
  textColor: string;
  /** Foreground on top of the primary accent (hex). */
  onPrimary: string;
}

const INK = '#0B1220';

interface OemAccent {
  /** True brand color. */
  primary: string;
  /** Brightened, saturated accent that reads on a dark surface. */
  glow: string;
}

export const defaultBrand: BrandConfig = buildBrand(
  'dealer-media-house',
  'Dealer Media House',
  { primary: '#0F8C8C', glow: '#2DE0C8' }
);

/**
 * Curated OEM accents. `primary` is the true brand hex (used for solid brand
 * chips); `glow` is a brightened, vivid companion tuned to sing on the dark
 * presentation canvas — as luminous data-viz, choropleth fills, and pins.
 */
const OEM_ACCENTS: Record<string, OemAccent> = {
  Acura: { primary: '#1F2A44', glow: '#7FA0FF' },
  Audi: { primary: '#BB0A30', glow: '#FF4D6A' },
  BMW: { primary: '#1C69D4', glow: '#4F9BFF' },
  Buick: { primary: '#9E1B32', glow: '#FF5C78' },
  Cadillac: { primary: '#8E1537', glow: '#FF5C86' },
  Chevrolet: { primary: '#0B5CAB', glow: '#48A0FF' },
  Chrysler: { primary: '#0B3D91', glow: '#5E92FF' },
  Dodge: { primary: '#C8102E', glow: '#FF4757' },
  Ford: { primary: '#0B5CAB', glow: '#45A6FF' },
  Genesis: { primary: '#5B4A2F', glow: '#D8B477' },
  GMC: { primary: '#C8102E', glow: '#FF5347' },
  Honda: { primary: '#CC0000', glow: '#FF4D4D' },
  Hyundai: { primary: '#002C5F', glow: '#4F9DFF' },
  Infiniti: { primary: '#1F2937', glow: '#9FB2CE' },
  Jeep: { primary: '#3C5A2E', glow: '#7FC65C' },
  Kia: { primary: '#BB162B', glow: '#FF4D62' },
  Lexus: { primary: '#34373B', glow: '#C2CAD6' },
  Lincoln: { primary: '#1B2A4A', glow: '#8FA8E0' },
  Mazda: { primary: '#910A2D', glow: '#FF4D6E' },
  Mercedes: { primary: '#33403B', glow: '#79E0C8' },
  'Mercedes-Benz': { primary: '#33403B', glow: '#79E0C8' },
  Mitsubishi: { primary: '#E60012', glow: '#FF4756' },
  Nissan: { primary: '#C3002F', glow: '#FF445F' },
  Ram: { primary: '#9A2A2A', glow: '#FF6A5C' },
  Subaru: { primary: '#001E62', glow: '#5C9BFF' },
  Toyota: { primary: '#D7202E', glow: '#FF4856' },
  Volkswagen: { primary: '#001E50', glow: '#5A9BFF' },
  Volvo: { primary: '#003057', glow: '#4FA6FF' },
};

interface ResolveBrandInput {
  /** Stored project brand id (often the default). */
  brandId?: string | null;
  /** Confirmed client dealer brand, e.g. "Hyundai". Highest signal. */
  clientBrand?: string | null;
  /** Audience file name, e.g. "Fontana Hyundai JUNE.xlsx". */
  fileName?: string | null;
  /** Project name, e.g. "Fontana Hyundai". */
  projectName?: string | null;
  /** Audience segment column names (used as a last-resort brand hint). */
  segmentNames?: string[];
}

/**
 * Resolve the accent for a project from the strongest available signal:
 * explicit client brand → file name → project name → segment column names →
 * default. Spelling in client data can be loose (e.g. "Nisan"), so we run
 * everything through the OEM detector which matches on substrings.
 */
export function resolveBrandAccent(input: ResolveBrandInput): BrandConfig {
  const brand =
    detectBrand(input.clientBrand ?? '') ??
    detectBrand(input.fileName ?? '') ??
    detectBrand(input.projectName ?? '') ??
    detectBrandFromSegments(input.segmentNames ?? []);

  if (brand && OEM_ACCENTS[brand]) {
    return buildBrand(slugify(brand), brand, OEM_ACCENTS[brand]!);
  }

  return defaultBrand;
}

/** Back-compat: legacy lookup by stored brand id. */
export function getBrand(brandId?: string): BrandConfig {
  if (!brandId || brandId === defaultBrand.id) return defaultBrand;
  const match = Object.keys(OEM_ACCENTS).find(b => slugify(b) === brandId);
  if (match) return buildBrand(brandId, match, OEM_ACCENTS[match]!);
  return defaultBrand;
}

function detectBrandFromSegments(segments: string[]): string | null {
  const counts = new Map<string, number>();
  for (const seg of segments) {
    const brand = detectBrand(seg);
    if (!brand) continue;
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [brand, count] of counts) {
    if (count > bestCount) {
      best = brand;
      bestCount = count;
    }
  }
  return best;
}

function buildBrand(id: string, name: string, accent: OemAccent): BrandConfig {
  const { primary, glow } = accent;
  return {
    id,
    name,
    primaryColor: primary,
    primaryDark: shade(primary, -0.22),
    primarySoft: rgba(primary, 0.1),
    glow,
    glowDeep: shade(glow, -0.3),
    glowSoft: rgba(glow, 0.14),
    glowLine: rgba(glow, 0.42),
    textColor: INK,
    onPrimary: readableOn(primary),
  };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const normalized = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const n = parseInt(normalized, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lighten (amount > 0) or darken (amount < 0) a hex color. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = (c: number) => clampChannel((t - c) * p + c);
  return `#${[mix(r), mix(g), mix(b)]
    .map(c => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Pick black/white text for contrast against a background color. */
function readableOn(hex: string): string {
  const [r, g, b] = toRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? INK : '#FFFFFF';
}
