import type { jsPDF } from 'jspdf';

/** jsPDF font family id for embedded Questa Sans (matches DMH site typography). */
export const REPORT_FONT_FAMILY = 'QuestaSans';

export type ReportFontFiles = {
  regularBase64: string;
  boldBase64: string;
};

const REGULAR_PATH = '/fonts/questa-sans-regular.ttf';
const BOLD_PATH = '/fonts/questa-sans-bold.ttf';

async function loadFontBase64(publicPath: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const file = join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
      return readFileSync(file).toString('base64');
    }
    const res = await fetch(publicPath);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

/** Load Questa Sans TTF files for PDF embedding (Regular + Bold). */
export async function loadReportFonts(): Promise<ReportFontFiles | null> {
  const [regularBase64, boldBase64] = await Promise.all([
    loadFontBase64(REGULAR_PATH),
    loadFontBase64(BOLD_PATH),
  ]);
  if (!regularBase64 || !boldBase64) return null;
  return { regularBase64, boldBase64 };
}

/**
 * Register brand fonts on a jsPDF instance.
 * Returns the family name to pass to `setFont`, or `helvetica` if fonts are missing.
 *
 * Identity-H is required for correct glyph advances with embedded TTF — without
 * it, jsPDF mis-measures widths and text/bar layouts drift.
 */
export function registerReportFonts(doc: jsPDF, fonts: ReportFontFiles | null | undefined): string {
  if (!fonts) return 'helvetica';
  doc.addFileToVFS('QuestaSans-Regular.ttf', fonts.regularBase64);
  doc.addFont('QuestaSans-Regular.ttf', REPORT_FONT_FAMILY, 'normal', 'Identity-H');
  doc.addFileToVFS('QuestaSans-Bold.ttf', fonts.boldBase64);
  doc.addFont('QuestaSans-Bold.ttf', REPORT_FONT_FAMILY, 'bold', 'Identity-H');
  return REPORT_FONT_FAMILY;
}
