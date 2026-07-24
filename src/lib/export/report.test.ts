import { describe, expect, it, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { defaultAgencyBrand, loadLogoDataUrl } from '@/lib/agency-brand';
import { resolveBrandAccent } from '@/lib/brands';
import type { DashboardModel } from '@/lib/audience/dashboard';
import {
  buildMarketReport,
  estimatePage1HeightWithoutComposition,
} from './report';
import { loadReportFonts, type ReportFontFiles } from './fonts';

function pdfPageHeightsMm(data: ArrayBuffer): number[] {
  const raw = Buffer.from(data).toString('latin1');
  return [...raw.matchAll(/\/MediaBox\s*\[\s*([^\]]+)\]/g)].map(m => {
    const nums = m[1].trim().split(/\s+/).map(Number);
    return ((nums[3] - nums[1]) * 25.4) / 72;
  });
}

// A 1x1 transparent PNG — stands in for the captured map canvas in tests.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let fonts: ReportFontFiles | null = null;
const model: DashboardModel = {
  totalAudience: 948068,
  totalZips: 265,
  segmentCount: 13,
  segments: [
    { name: 'Non-Hispanic Vehicle Owners – 6–15 Years Old', total: 188_000, zips: 240, share: 0.198 },
    { name: 'Hispanic NISSAN Owners', total: 142_000, zips: 220, share: 0.15 },
    { name: 'Non-Hispanic NISSAN Intenders', total: 96_000, zips: 210, share: 0.101 },
    { name: 'Hispanic Pre-Owned Intenders', total: 72_500, zips: 180, share: 0.076 },
  ],
  topSegment: {
    name: 'Non-Hispanic Vehicle Owners – 6–15 Years Old',
    total: 188_000,
    zips: 240,
    share: 0.198,
  },
  composition: [
    {
      id: 'ethnicity',
      coverage: 1,
      buckets: [
        { label: 'Non-Hispanic', total: 520_000, share: 0.548 },
        { label: 'Hispanic', total: 428_068, share: 0.452 },
      ],
    },
    {
      id: 'intent',
      coverage: 1,
      buckets: [
        { label: 'Owners', total: 600_000, share: 0.633 },
        { label: 'Intenders', total: 348_068, share: 0.367 },
      ],
    },
  ],
  concentration: {
    topZips: [
      { zip: '10314', count: 15_481, share: 0.016 },
      { zip: '11226', count: 15_448, share: 0.016 },
    ],
    top5Share: 0.07,
    top10Share: 0.12,
    zipsForHalf: 57,
  },
  tradeArea: {
    radiusMiles: 25,
    audienceInRadius: 136_000,
    zipsInRadius: 92,
    share: 0.2,
    centroidsResolved: true,
    topZips: [
      { zip: '92335', count: 12_400, share: 0.091 },
      { zip: '92336', count: 11_900, share: 0.087 },
      { zip: '91761', count: 9_800, share: 0.072 },
    ],
    top5Share: 0.2,
    zipsForHalf: 18,
    leadSegment: {
      name: 'Non-Hispanic Vehicle Owners – 6–15 Years Old',
      total: 27_200,
      zips: 80,
      share: 0.2,
    },
    segments: [
      { name: 'Non-Hispanic Vehicle Owners – 6–15 Years Old', total: 27_200, zips: 80, share: 0.2 },
      { name: 'Hispanic NISSAN Owners', total: 24_000, zips: 75, share: 0.176 },
    ],
  },
  competitive: {
    competitorCount: 16,
    competitorBrands: ['Hyundai', 'Kia', 'Toyota'],
    whiteSpace: [
      { zip: '92335', count: 12_400 },
      { zip: '92336', count: 11_900 },
    ],
  },
};

describe('buildMarketReport', () => {
  beforeAll(async () => {
    fonts = await loadReportFonts();
    expect(fonts).not.toBeNull();
  });

  it('produces a two-page PDF when a map image is supplied', async () => {
    const logoDataUrl = await loadLogoDataUrl(defaultAgencyBrand.logo);
    const doc = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      logoDataUrl,
      fonts,
      projectName: 'Fontana Hyundai',
      datasetLabel: 'Fontana Hyundai JUNE.xlsx',
      focusName: 'Fontana Hyundai',
      radiusMiles: 25,
      model,
      mapImage: { dataUrl: TINY_PNG, width: 1600, height: 1000 },
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });

    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.getFontList().QuestaSans).toEqual(['normal', 'bold']);

    const buf = Buffer.from(doc.output('arraybuffer'));
    expect(buf.length).toBeGreaterThan(1000);
    if (process.env.WRITE_PDF) writeFileSync('/tmp/mom-report.pdf', buf);
  });

  it('produces a single page when no map image is available', () => {
    const doc = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      fonts,
      projectName: 'Fontana Hyundai',
      datasetLabel: null,
      focusName: null,
      radiusMiles: 25,
      model,
      mapImage: null,
      includeComposition: false,
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });

    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('omits composition charts when includeComposition is false', async () => {
    const withComposition = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      fonts,
      projectName: 'Fontana Hyundai',
      datasetLabel: null,
      focusName: null,
      radiusMiles: 25,
      model,
      mapImage: null,
      includeComposition: true,
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });
    const withoutComposition = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      fonts,
      projectName: 'Fontana Hyundai',
      datasetLabel: null,
      focusName: null,
      radiusMiles: 25,
      model,
      mapImage: null,
      includeComposition: false,
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });

    const withBuf = Buffer.from(withComposition.output('arraybuffer'));
    const withoutBuf = Buffer.from(withoutComposition.output('arraybuffer'));
    expect(withoutBuf.length).toBeLessThan(withBuf.length);
  });

  it('keeps the map on page 2 at full size and shortens page 1 MediaBox when composition is off', () => {
    const withComposition = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      fonts,
      projectName: 'Fontana Hyundai',
      datasetLabel: null,
      focusName: 'CardinaleWay Hyundai - Glendora',
      radiusMiles: 15,
      model,
      mapImage: { dataUrl: TINY_PNG, width: 1600, height: 1000 },
      includeComposition: true,
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });
    const withoutComposition = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      fonts,
      projectName: 'Fontana Hyundai',
      datasetLabel: null,
      focusName: 'CardinaleWay Hyundai - Glendora',
      radiusMiles: 15,
      model,
      mapImage: { dataUrl: TINY_PNG, width: 1600, height: 1000 },
      includeComposition: false,
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });

    expect(withComposition.getNumberOfPages()).toBe(2);
    expect(withoutComposition.getNumberOfPages()).toBe(2);

    const withHeights = pdfPageHeightsMm(withComposition.output('arraybuffer'));
    const withoutHeights = pdfPageHeightsMm(withoutComposition.output('arraybuffer'));

    // File bytes: page 1 MediaBox is short when donuts are off; page 2 stays A4.
    expect(withoutHeights[0]).toBeLessThan(260);
    expect(withoutHeights[0]).toBeGreaterThan(180);
    expect(withoutHeights[1]).toBeCloseTo(297, 0);

    // Composition on → both pages full A4.
    expect(withHeights[0]).toBeCloseTo(297, 0);
    expect(withHeights[1]).toBeCloseTo(297, 0);

    // Height was applied before draw (matches estimator).
    const expected = estimatePage1HeightWithoutComposition(
      model.tradeArea?.leadSegment?.name ?? model.topSegment?.name ?? null,
      fonts
    );
    expect(withoutHeights[0]).toBeCloseTo(expected, 0);
  });

  it('does not put the focus dealer name in the trade-area KPI subtext', () => {
    const focusName = 'CardinaleWay Hyundai - Glendora';
    // Helvetica keeps literal strings searchable in the PDF bytes; embedded
    // Questa encodes glyphs and would break this content assertion.
    const doc = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      fonts: null,
      projectName: 'test2',
      datasetLabel: null,
      focusName,
      radiusMiles: 15,
      model,
      mapImage: null,
      includeComposition: false,
      generatedAt: new Date('2026-07-15T00:00:00Z'),
    });

    const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(raw.includes('within 15 mi')).toBe(true);
    expect(raw.includes(`of ${focusName}`)).toBe(false);
  });
});
