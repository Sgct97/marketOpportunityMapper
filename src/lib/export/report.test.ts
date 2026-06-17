import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { defaultAgencyBrand, loadLogoDataUrl } from '@/lib/agency-brand';
import { resolveBrandAccent } from '@/lib/brands';
import type { DashboardModel } from '@/lib/audience/dashboard';
import { buildMarketReport } from './report';

// A 1x1 transparent PNG — stands in for the captured map canvas in tests.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

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
  it('produces a two-page PDF when a map image is supplied', async () => {
    const logoDataUrl = await loadLogoDataUrl(defaultAgencyBrand.logo);
    const doc = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      logoDataUrl,
      projectName: 'Fontana Hyundai',
      datasetLabel: 'Fontana Hyundai JUNE.xlsx',
      focusName: 'Fontana Hyundai',
      radiusMiles: 25,
      model,
      mapImage: { dataUrl: TINY_PNG, width: 1600, height: 1000 },
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });

    expect(doc.getNumberOfPages()).toBe(2);

    const buf = Buffer.from(doc.output('arraybuffer'));
    expect(buf.length).toBeGreaterThan(1000);
    if (process.env.WRITE_PDF) writeFileSync('/tmp/mom-report.pdf', buf);
  });

  it('produces a single page when no map image is available', async () => {
    const doc = buildMarketReport({
      brand: resolveBrandAccent({ clientBrand: 'Hyundai' }),
      agencyBrand: defaultAgencyBrand,
      projectName: 'Fontana Hyundai',
      datasetLabel: null,
      focusName: null,
      radiusMiles: 25,
      model,
      mapImage: null,
      generatedAt: new Date('2026-06-16T00:00:00Z'),
    });

    expect(doc.getNumberOfPages()).toBe(1);
  });
});
