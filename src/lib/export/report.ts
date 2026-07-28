import { jsPDF } from 'jspdf';
import type { AgencyBrandConfig } from '@/lib/agency-brand';
import type { BrandConfig } from '@/lib/brands';
import type { DashboardModel, SegmentTotal, TopZip } from '@/lib/audience/dashboard';
import {
  TOP_SEGMENT_DISPLAY_COUNT,
  TOP_ZIP_DISPLAY_COUNT,
} from '@/lib/audience/presentation-limits';
import type { ReachScopeCopy } from '@/lib/audience/presentation-scope';
import type { MapImage } from '@/lib/map/export-capture';
import { normalizeZipCode, type ZipLabel } from '@/lib/map/zip-labels';
import { formatCompact, formatNumber, formatPercent, EMPTY_VALUE } from '@/lib/format';
import {
  registerReportFonts,
  type ReportFontFiles,
} from '@/lib/export/fonts';

export type { MapImage };

export interface ReportInput {
  /** OEM / pitch accent — drives charts, KPIs, and map highlights. */
  brand: BrandConfig;
  /** Agency letterhead — logo, footer, and report chrome. */
  agencyBrand: AgencyBrandConfig;
  /** Pre-loaded logo data URL for jsPDF; omit to fall back to agency name text. */
  logoDataUrl?: string | null;
  /** Embedded Questa Sans (Regular + Bold). Falls back to Helvetica if omitted. */
  fonts?: ReportFontFiles | null;
  projectName: string;
  datasetLabel: string | null;
  focusName: string | null;
  radiusMiles: number;
  model: DashboardModel;
  /** Captured map snapshot, or null if the map was unavailable. */
  mapImage: MapImage | null;
  zipLabels?: Record<string, ZipLabel>;
  /** Mirrors the map segment scope for hero copy. */
  reachScope?: ReachScopeCopy;
  excludedZipCount?: number;
  /** When false, omit Audience composition donuts from the PDF. Defaults to true. */
  includeComposition?: boolean;
  generatedAt?: Date;
}

type Rgb = [number, number, number];

// Print palette — a clean, light, client-ready report regardless of the
// on-screen (often dark) presentation theme. The brand accent is the only
// project-specific color and flows through headers, bars, and highlights.
const INK: Rgb = [11, 18, 32];
const INK2: Rgb = [40, 54, 74];
const MUTED: Rgb = [91, 107, 130];
const FAINT: Rgb = [138, 152, 173];
const LINE: Rgb = [223, 230, 240];
const SURFACE: Rgb = [245, 248, 252];
const WHITE: Rgb = [255, 255, 255];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Letterhead height (mm) — dark brand bar + cyan accent, CTV-report style. */
const HEADER_H = 36;
const HEADER_ACCENT_H = 2.2;
const CONTENT_TOP = HEADER_H + 10;

function hexToRgb(hex: string): Rgb {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const v = parseInt(n, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Mix a color toward white by `amount` (0–1) for soft tints. */
function tint([r, g, b]: Rgb, amount: number): Rgb {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const FOOTER_BAND = 18;

/**
 * Page-1 MediaBox height (content + footer). Must be applied BEFORE drawing.
 */
export function estimatePage1Height(
  leadSegmentName: string | null,
  hasMap: boolean,
  compositionFacetCount: number,
  mapAspectRatio?: number | null,
  fonts?: ReportFontFiles | null
): number {
  const probe = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const font = registerReportFonts(probe, fonts);
  let y = CONTENT_TOP + 6;

  const gap = 5;
  const mapColW = hasMap ? CONTENT_W * 0.48 : 0;
  const metricsW = hasMap ? CONTENT_W - mapColW - gap : CONTENT_W;

  let metricsH = 11 + 6.5 + 10;
  if (leadSegmentName) {
    probe.setFont(font, 'bold');
    probe.setFontSize(11);
    const nameLines = probe.splitTextToSize(leadSegmentName, metricsW);
    metricsH += 5 + 7 + 8 + nameLines.length * 5 + 3 + 8;
  }
  metricsH += 5 + 9; // bubble
  const ar = mapAspectRatio && mapAspectRatio > 0 ? mapAspectRatio : 0.75;
  const mapH = hasMap ? mapColW * ar + 2.4 : 0;
  y += Math.max(metricsH, mapH) + 4;
  // KPI row
  y += 28 + 6;
  if (compositionFacetCount > 0) {
    y += 5 + 40 + 5;
  }
  return Math.min(PAGE_H, Math.max(y + FOOTER_BAND, HEADER_H + 80));
}

/** @deprecated Prefer estimatePage1Height — kept for existing callers/tests. */
export function estimatePage1HeightWithoutComposition(
  leadSegmentName: string | null,
  hasMap: boolean,
  fonts?: ReportFontFiles | null
): number {
  return estimatePage1Height(leadSegmentName, hasMap, 0, null, fonts);
}

/** Page-2 MediaBox height for segment + ZIP tables. Apply before drawing page 2. */
export function estimatePage2Height(
  segmentCount: number,
  zipCount: number
): number {
  let y = CONTENT_TOP;
  const segRows = Math.min(Math.max(segmentCount, 1), TOP_SEGMENT_DISPLAY_COUNT);
  const zipRows = Math.min(Math.max(zipCount, 1), TOP_ZIP_DISPLAY_COUNT);
  const segH = 6 + 5 + segRows * 8.5 + (segmentCount > segRows ? 6 : 2);
  const zipH = 6 + 5 + (zipCount === 0 ? 8 : zipRows * 8.5) + 2;
  y += Math.max(segH, zipH);
  return Math.min(PAGE_H, Math.max(y + FOOTER_BAND, HEADER_H + 70));
}

/**
 * Build a branded, print-ready market opportunity report from the SAME model
 * that drives the live dashboard plus a snapshot of the current map. Returns a
 * jsPDF document ready to `.save()`.
 */
export function buildMarketReport(input: ReportInput): jsPDF {
  const {
    brand,
    agencyBrand,
    logoDataUrl,
    fonts,
    projectName,
    datasetLabel,
    focusName,
    radiusMiles,
    model,
    mapImage,
    zipLabels = {},
    reachScope,
    excludedZipCount = 0,
    includeComposition = true,
  } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const scopeCopy = reachScope ?? {
    headline: 'Total reach (all segments)',
    segmentPhrase: `${model.segmentCount} segments`,
  };
  // The body accent follows the active palette chosen in the presentation (the
  // caller passes either the vehicle/OEM brand or the agency brand here), while
  // the agency stripe/letterhead always uses the agency primary.
  const accent = hexToRgb(brand.primaryColor);
  const accentSoft = tint(accent, 0.86);
  const accentLine = tint(accent, 0.62);
  // Letterhead teal — card borders + map letterbox fill.
  const chrome = hexToRgb(
    agencyBrand.headerBackgroundColor ?? agencyBrand.primaryColor
  );

  // Mirror the dashboard's trade-area decision so the report shows exactly what
  // the presenter sees on screen.
  const tradeArea = model.tradeArea;
  const useTradeArea = Boolean(
    tradeArea && tradeArea.centroidsResolved && tradeArea.zipsInRadius > 0
  );
  const subjectName = focusName || brand.name;
  const heroReach = useTradeArea ? tradeArea!.audienceInRadius : model.totalAudience;
  const heroZips = useTradeArea ? tradeArea!.zipsInRadius : model.totalZips;
  const leadSegment = (useTradeArea ? tradeArea!.leadSegment : null) ?? model.topSegment;
  const activeSegments = useTradeArea ? tradeArea!.segments : model.segments;
  const conc = useTradeArea
    ? { top5Share: tradeArea!.top5Share, zipsForHalf: tradeArea!.zipsForHalf }
    : { top5Share: model.concentration.top5Share, zipsForHalf: model.concentration.zipsForHalf };
  const topZips = useTradeArea ? tradeArea!.topZips : model.concentration.topZips;
  const topZipsScope = useTradeArea ? `Within ${radiusMiles} mi` : 'Across market';

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const font = registerReportFonts(doc, fonts);
  doc.setFont(font, 'normal');

  // Short MediaBox BEFORE drawing — jsPDF bakes y transforms from page height.
  const facetsForPage1 = includeComposition ? model.composition.slice(0, 2) : [];
  const mapAr = mapImage && mapImage.width > 0 ? mapImage.height / mapImage.width : null;
  doc.internal.pageSize.height = estimatePage1Height(
    leadSegment?.name ?? null,
    Boolean(mapImage),
    facetsForPage1.length,
    mapAr,
    fonts
  );

  // ── helpers bound to this doc ──────────────────────────────────────────
  const setFill = (c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
  const setStroke = (c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);

  // Brand face only (Questa when embedded). Never swap numerics to Helvetica —
  // alignment is handled with fixed columns / equal digit slots below.
  const labelFont = (style: 'normal' | 'bold' = 'normal') => {
    doc.setCharSpace(0);
    doc.setFont(font, style);
  };
  const numFont = (style: 'normal' | 'bold' = 'bold') => {
    doc.setCharSpace(0);
    doc.setFont(font, style);
  };

  function write(
    text: string | string[],
    x: number,
    y: number,
    opts?: { align?: 'left' | 'center' | 'right'; baseline?: 'alphabetic' | 'top' | 'middle' | 'bottom' }
  ) {
    doc.setCharSpace(0);
    doc.text(text, x, y, opts);
  }

  function eyebrow(text: string, x: number, y: number) {
    labelFont('bold');
    doc.setFontSize(7.5);
    setText(FAINT);
    doc.setCharSpace(0.35);
    doc.text(text.toUpperCase(), x, y);
    doc.setCharSpace(0);
  }

  function drawHeaderBand() {
    // CTV-style letterhead: dark brand bar, cyan accent rule, white lockup —
    // agency logo (left) · report title (center) · client meta (right).
    const headerBg = hexToRgb(
      agencyBrand.headerBackgroundColor ?? agencyBrand.primaryColor
    );
    const headerAccent = hexToRgb(
      agencyBrand.headerAccentColor ?? agencyBrand.glow ?? agencyBrand.secondaryColor
    );
    const onHeader: Rgb = WHITE;
    const onHeaderMuted: Rgb = tint(headerAccent, 0.55);
    const bandH = HEADER_H - HEADER_ACCENT_H;
    const bandMid = bandH / 2;

    setFill(headerBg);
    doc.rect(0, 0, PAGE_W, bandH, 'F');
    setFill(headerAccent);
    doc.rect(0, bandH, PAGE_W, HEADER_ACCENT_H, 'F');

    // ── Left: agency logo, vertically centered in the dark band ──
    const logoH = 14;
    const logoY = bandMid - logoH / 2;
    let lockX = MARGIN;
    let logoPlaced = false;
    if (logoDataUrl) {
      const logoW = logoH * agencyBrand.logoAspect;
      try {
        doc.addImage(logoDataUrl, agencyBrand.logoFormat, MARGIN, logoY, logoW, logoH, undefined, 'FAST');
        lockX = MARGIN + logoW + 7;
        logoPlaced = true;
      } catch {
        logoPlaced = false;
      }
    }
    if (!logoPlaced) {
      labelFont('normal');
      doc.setFontSize(11);
      setText(onHeader);
      write(agencyBrand.name.toLowerCase(), MARGIN, bandMid + 1.5);
      lockX = MARGIN + doc.getTextWidth(agencyBrand.name.toLowerCase()) + 7;
    }

    // ── Vertical divider ──
    setStroke(onHeaderMuted);
    doc.setLineWidth(0.35);
    doc.line(lockX, logoY + 0.5, lockX, logoY + logoH - 0.5);
    const idX = lockX + 7;

    // ── Center: report title ──
    const metaColW = 54;
    const idMaxW = PAGE_W - MARGIN - metaColW - idX - 4;
    labelFont('bold');
    let titleSize = 20;
    const reportTitle = 'Market Opportunity Report';
    doc.setFontSize(titleSize);
    while (titleSize > 13 && doc.getTextWidth(reportTitle) > idMaxW) {
      titleSize -= 0.5;
      doc.setFontSize(titleSize);
    }
    setText(onHeader);
    write(reportTitle, idX, bandMid + 2.4);

    // ── Right: client / scope meta (right-aligned) ──
    const metaX = PAGE_W - MARGIN;
    const metaTop = subjectName || projectName;
    labelFont('bold');
    doc.setFontSize(10);
    setText(onHeader);
    const metaTitle =
      doc.splitTextToSize(metaTop, metaColW)[0] ?? metaTop;
    write(metaTitle, metaX, bandMid - 4.2, { align: 'right' });

    labelFont('normal');
    doc.setFontSize(8);
    setText(onHeaderMuted);
    write(
      useTradeArea ? `${radiusMiles} mi trade area` : 'Full market',
      metaX,
      bandMid + 1.2,
      { align: 'right' }
    );

    doc.setFontSize(6.5);
    const sourceBit = datasetLabel ? `Source: ${datasetLabel}` : 'Source: Audience data';
    const sourceLine = `${sourceBit} · ${formatDate(generatedAt)}`;
    const sourceFit = doc.splitTextToSize(sourceLine, metaColW)[0] ?? sourceLine;
    write(sourceFit, metaX, bandMid + 6.2, { align: 'right' });
  }

  function footer(pageLabel: string) {
    const h = doc.internal.pageSize.getHeight();
    setStroke(LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, h - 14, PAGE_W - MARGIN, h - 14);
    labelFont('normal');
    doc.setFontSize(7.5);
    setText(FAINT);
    write(agencyBrand.name, MARGIN, h - 9);
    write(pageLabel, PAGE_W - MARGIN, h - 9, { align: 'right' });
  }

  // KPI card
  function kpiCard(x: number, y: number, w: number, h: number, label: string, value: string, sub: string, badge?: string) {
    setFill(SURFACE);
    setStroke(chrome);
    doc.setLineWidth(0.45);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
    eyebrow(label, x + 5, y + 7);
    numFont('bold');
    doc.setFontSize(18);
    setText(INK);
    write(value, x + 5, y + 18);
    if (badge) {
      numFont('bold');
      doc.setFontSize(8);
      const bw = doc.getTextWidth(badge) + 6;
      setFill(accentSoft);
      doc.roundedRect(x + w - bw - 5, y + 11.5, bw, 6.5, 3.25, 3.25, 'F');
      setText(accent);
      write(badge, x + w - bw - 5 + bw / 2, y + 16, { align: 'center' });
    }
    labelFont('normal');
    doc.setFontSize(7.5);
    setText(MUTED);
    const subLines = doc.splitTextToSize(sub, w - 10);
    write(subLines.slice(0, 2), x + 5, y + 25);
  }

  // Horizontal proportion bar — always absolute page coords (no text matrix).
  function bar(x: number, y: number, w: number, ratio: number) {
    doc.setCharSpace(0);
    setFill(tint(LINE, 0.3));
    doc.roundedRect(x, y, w, 2.2, 1.1, 1.1, 'F');
    const fw = Math.max(1.5, Math.min(w, w * Math.max(0, Math.min(1, ratio))));
    setFill(accent);
    doc.roundedRect(x, y, fw, 2.2, 1.1, 1.1, 'F');
  }

  // Mirror the dashboard donut palette: the accent at decreasing "opacity",
  // which on the white report reads as the accent mixed toward white.
  const DONUT_ALPHAS = [1, 0.58, 0.38, 0.25, 0.16];
  const bucketColor = (i: number): Rgb => tint(accent, 1 - (DONUT_ALPHAS[i] ?? 0.12));

  function strokeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, thickness: number, color: Rgb) {
    const steps = Math.max(2, Math.ceil(Math.abs(endDeg - startDeg) / 5));
    setStroke(color);
    doc.setLineWidth(thickness);
    doc.setLineCap('butt');
    const pt = (deg: number) => {
      const a = (deg * Math.PI) / 180;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    };
    let prev = pt(startDeg);
    for (let s = 1; s <= steps; s++) {
      const p = pt(startDeg + ((endDeg - startDeg) * s) / steps);
      doc.line(prev.x, prev.y, p.x, p.y);
      prev = p;
    }
  }

  function drawDonut(
    cx: number,
    cy: number,
    diameter: number,
    thickness: number,
    buckets: { label: string; share: number }[],
    title: string
  ) {
    const outerR = diameter / 2;
    const r = outerR - thickness / 2;
    const holeR = outerR - thickness;
    // Track ring
    strokeArc(cx, cy, r, 0, 359.999, thickness, tint(LINE, 0.15));
    // Arcs, starting at top (-90°), sweeping clockwise, with a small gap.
    let cursor = -90;
    const gap = buckets.length > 1 ? 3 : 0;
    buckets.forEach((b, i) => {
      const sweep = Math.max(0, b.share * 360 - gap);
      if (sweep > 0) strokeArc(cx, cy, r, cursor + gap / 2, cursor + gap / 2 + sweep, thickness, bucketColor(i));
      cursor += b.share * 360;
    });
    doc.setLineCap('round');

    // Center share — brand face (same as the rest of the report).
    numFont('bold');
    doc.setFontSize(12);
    setText(INK);
    write(buckets[0] ? formatPercent(buckets[0].share) : EMPTY_VALUE, cx, cy - 0.8, {
      align: 'center',
    });

    // Facet/bucket title must stay inside the hole. Chord width shrinks below
    // center, so wrap (and shrink) to ~75% of the hole diameter with no tracking.
    const upper = title.trim().toUpperCase();
    if (!upper || holeR <= 0) return;

    const maxTitleW = Math.max(6, holeR * 2 * 0.75);
    let titleSize = 5.5;
    let lines: string[] = [upper];
    labelFont('bold');
    for (; titleSize >= 4; titleSize -= 0.25) {
      doc.setFontSize(titleSize);
      lines = doc.splitTextToSize(upper, maxTitleW);
      const widest = Math.max(...lines.map(line => doc.getTextWidth(line)), 0);
      if (lines.length <= 2 && widest <= maxTitleW + 0.1) break;
    }
    lines = lines.slice(0, 2);

    const lineH = titleSize * 0.42;
    const blockH = lineH * lines.length;
    // Keep the title block inside the hole: bottom ≤ cy + holeR - padding.
    const maxBottom = cy + holeR - 1.1;
    let titleY = cy + 2.6;
    if (titleY + blockH - lineH > maxBottom) {
      titleY = maxBottom - blockH + lineH;
    }

    setText(FAINT);
    labelFont('bold');
    doc.setFontSize(titleSize);
    lines.forEach((line, i) => {
      write(line, cx, titleY + i * lineH, { align: 'center' });
    });
  }

  // ═══════════════════════ PAGE 1 — Dashboard story + map preview ═══════════
  drawHeaderBand();

  // Dashboard-style hero: metrics stack (left) · map preview (right).
  const heroGap = 5;
  const mapColW = mapImage ? CONTENT_W * 0.48 : 0;
  const metricsW = mapImage ? CONTENT_W - mapColW - heroGap : CONTENT_W;
  const metricsX = MARGIN;
  const mapX = MARGIN + metricsW + heroGap;

  const reachSizePt = 40;
  const heroTop = CONTENT_TOP + 6;

  // ── Left: reach → lead audience → concentration bubble (looser type scale) ──
  numFont('bold');
  doc.setFontSize(reachSizePt);
  setText(accent);
  write(formatCompact(heroReach), metricsX, heroTop);
  let metricsY = heroTop + 11;
  labelFont('bold');
  doc.setFontSize(13);
  setText(INK);
  write(scopeCopy.headline, metricsX, metricsY);
  metricsY += 6.5;
  labelFont('normal');
  doc.setFontSize(9);
  setText(FAINT);
  const reachMeta = `${scopeCopy.segmentPhrase} · ${formatNumber(heroZips)} ZIPs · overlapping${
    useTradeArea ? ` · within ${radiusMiles} mi` : ' · across the market'
  }${excludedZipCount > 0 ? ` · ${formatNumber(excludedZipCount)} ZIP${excludedZipCount === 1 ? '' : 's'} excluded` : ''}`;
  const reachMetaLines: string[] = doc.splitTextToSize(reachMeta, metricsW);
  write(reachMetaLines, metricsX, metricsY);
  const metaLineH = 4.2;
  const metaBottom = metricsY + (reachMetaLines.length - 1) * metaLineH + 1.2;

  if (leadSegment) {
    // Center the rule between meta text and the top of the lead figure.
    const leadSizePt = 26;
    const leadCapMm = leadSizePt * 0.352778 * 0.72;
    const ruleGap = 3.8;
    const ruleY = metaBottom + ruleGap;
    const leadBaseline = ruleY + ruleGap + leadCapMm;

    setStroke(LINE);
    doc.setLineWidth(0.2);
    doc.line(metricsX, ruleY, metricsX + metricsW, ruleY);

    metricsY = leadBaseline;
    numFont('bold');
    doc.setFontSize(leadSizePt);
    setText(INK);
    const leadValue = formatCompact(leadSegment.total);
    const leadW = doc.getTextWidth(leadValue);
    write(leadValue, metricsX, metricsY);
    numFont('bold');
    doc.setFontSize(10);
    setText(accent);
    write(`${formatPercent(leadSegment.share)} of reach`, metricsX + leadW + 3.5, metricsY - 0.5);
    metricsY += 8;
    labelFont('bold');
    doc.setFontSize(11);
    setText(INK);
    const nameLines: string[] = doc.splitTextToSize(leadSegment.name, metricsW);
    write(nameLines, metricsX, metricsY);
    metricsY += nameLines.length * 5 + 3;
    labelFont('normal');
    doc.setFontSize(8.5);
    setText(FAINT);
    const caption = `Largest single audience${useTradeArea ? ' in the trade area' : ''}. A true headcount, not a sum.`;
    const captionLines: string[] = doc.splitTextToSize(caption, metricsW);
    write(captionLines, metricsX, metricsY);
    metricsY += captionLines.length * 3.8 + 5;
  } else {
    metricsY = metaBottom + 5;
  }

  const calloutText = `${formatPercent(conc.top5Share)} concentrated in the top 5 ZIPs  ·  ${formatNumber(
    conc.zipsForHalf
  )} ZIPs make up half the reach`;
  const calloutPadX = 3.5;
  let calloutSize = 8;
  labelFont('normal');
  doc.setFontSize(calloutSize);
  while (calloutSize > 6 && doc.getTextWidth(calloutText) > metricsW - calloutPadX * 2) {
    calloutSize -= 0.25;
    doc.setFontSize(calloutSize);
  }
  const calloutLines: string[] = doc.splitTextToSize(calloutText, metricsW - calloutPadX * 2);
  const calloutLineH = calloutSize * 0.4;
  const calloutH = Math.max(8.5, 4 + calloutLines.length * calloutLineH);
  setFill(accentSoft);
  setStroke(accentLine);
  doc.setLineWidth(0.2);
  doc.roundedRect(metricsX, metricsY, metricsW, calloutH, 2, 2, 'FD');
  setText(INK2);
  const calloutTextY =
    metricsY + (calloutH - calloutLineH * (calloutLines.length - 1)) / 2 + calloutLineH * 0.35;
  write(calloutLines, metricsX + metricsW / 2, calloutTextY, { align: 'center' });
  metricsY += calloutH;

  // ── Right: map — equal chrome padding; bottom-aligned with the bubble ──
  let mapBottom = metricsY;
  if (mapImage) {
    const pad = 1.2;
    const strokeW = 0.3;
    const ar = mapImage.height / mapImage.width;
    const imgW = mapColW - pad * 2;
    const imgH = imgW * ar;
    const frameH = imgH + pad * 2;
    // Sit the map on the same baseline as the concentration bubble.
    const frameY = metricsY - frameH;
    const imgX = mapX + pad;
    const imgY = frameY + pad;

    setFill(chrome);
    setStroke(chrome);
    doc.setLineWidth(strokeW);
    doc.roundedRect(mapX, frameY, mapColW, frameH, 2, 2, 'FD');
    try {
      doc.addImage(mapImage.dataUrl, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');
    } catch {
      setFill(tint(LINE, 0.4));
      doc.rect(imgX, imgY, imgW, imgH, 'F');
    }
    setStroke(chrome);
    doc.setLineWidth(strokeW);
    doc.roundedRect(mapX, frameY, mapColW, frameH, 2, 2, 'S');
    mapBottom = frameY + frameH;
  }

  let y = Math.max(metricsY, mapBottom) + 4;

  // KPI row — ZIPs + concentration side by side
  const gap = 4;
  const kw = (CONTENT_W - gap) / 2;
  const kh = 28;
  if (useTradeArea) {
    kpiCard(
      MARGIN,
      y,
      kw,
      kh,
      'ZIPs in trade area',
      formatNumber(heroZips),
      `within ${radiusMiles} mi`
    );
  } else {
    kpiCard(
      MARGIN,
      y,
      kw,
      kh,
      'Lead segment share',
      model.topSegment ? formatPercent(model.topSegment.share) : EMPTY_VALUE,
      model.topSegment?.name ?? 'No segments'
    );
  }
  kpiCard(
    MARGIN + kw + gap,
    y,
    kw,
    kh,
    'Market concentration',
    formatPercent(conc.top5Share),
    `from the top 5 ZIPs · ${formatNumber(conc.zipsForHalf)} ZIPs make up half`
  );
  y += kh + 6;

  // Audience composition (up to 2 facets) — donut + legend, like the dashboard.
  const facets = facetsForPage1;
  if (facets.length > 0) {
    eyebrow('Audience composition · grouped from segment names', MARGIN, y);
    y += 5;
    const cardH = 40;
    const fw = (CONTENT_W - gap) / 2;
    facets.forEach((facet, fi) => {
      const fx = MARGIN + fi * (fw + gap);
      setFill(SURFACE);
      setStroke(chrome);
      doc.setLineWidth(0.45);
      doc.roundedRect(fx, y, fw, cardH, 2.5, 2.5, 'FD');

      const buckets = facet.buckets.slice(0, 5);
      const dia = 30;
      const cx = fx + 6 + dia / 2;
      const cy = y + cardH / 2;
      drawDonut(cx, cy, dia, 6, buckets, buckets[0]?.label ?? '');

      // Legend
      const lx = fx + 6 + dia + 6;
      const lw = fx + fw - 5 - lx;
      const rowH = Math.min(7.5, (cardH - 8) / Math.max(1, buckets.length));
      let ly = y + (cardH - rowH * buckets.length) / 2 + rowH / 2;
      buckets.forEach((b, i) => {
        setFill(bucketColor(i));
        doc.circle(lx + 1.4, ly - 1, 1.4, 'F');
        labelFont('normal');
        doc.setFontSize(8);
        setText(INK2);
        const label = doc.splitTextToSize(b.label, lw - 18)[0] ?? b.label;
        write(label, lx + 5, ly);
        numFont('bold');
        setText(INK);
        write(formatPercent(b.share), fx + fw - 5, ly, { align: 'right' });
        ly += rowH;
      });
    });
    y += cardH + 5;
  }

  // Page 2 exists when we have a map export (breakdown tables live there).
  const totalPages = mapImage ? 2 : 1;
  footer(`Page 1 of ${totalPages}  ·  Generated ${formatDate(generatedAt)}`);

  // ═══════════════════════ PAGE 2 — Audience metrics only ═══════════════════
  if (mapImage) {
    const page2H = estimatePage2Height(activeSegments.length, topZips.length);
    // Always add a full-width A4 page, then shorten height only.
    // addPage([w, h], 'portrait') swaps w/h when h < w — that made page 2 narrow.
    doc.addPage([PAGE_W, PAGE_H], 'portrait');
    doc.internal.pageSize.height = page2H;
    drawHeaderBand();
    y = CONTENT_TOP;

    const colGap = 8;
    const leftW = CONTENT_W * 0.56;
    const rightW = CONTENT_W - leftW - colGap;
    const rightX = MARGIN + leftW + colGap;
    drawSegmentTable(MARGIN, y, leftW, activeSegments, heroReach);
    drawTopZips(rightX, y, rightW, topZips, topZipsScope);

    footer(`Page 2 of 2  ·  Generated ${formatDate(generatedAt)}`);
  }

  // ── nested table renderers (use the bound helpers above) ───────────────
  function drawSegmentTable(x: number, top: number, w: number, segments: SegmentTotal[], total: number) {
    eyebrow(
      `Audience segment breakdown · top ${TOP_SEGMENT_DISPLAY_COUNT} of ${segments.length} segments`,
      x,
      top
    );
    let ty = top + 6;
    labelFont('normal');
    doc.setFontSize(7.5);
    setText(FAINT);
    write(`Total audience ${formatNumber(total)}`, x, ty);
    ty += 5;
    const max = segments[0]?.total ?? 1;
    const rows = segments.slice(0, TOP_SEGMENT_DISPLAY_COUNT);
    const barX = x + 5;
    const barW = w - 5;
    rows.forEach((seg, i) => {
      const rowTop = ty;
      numFont('bold');
      doc.setFontSize(8);
      setText(MUTED);
      write(String(i + 1), x, rowTop);
      labelFont('normal');
      setText(INK2);
      const name = doc.splitTextToSize(seg.name, w - 34)[0] ?? seg.name;
      write(name, x + 5, rowTop);
      numFont('bold');
      setText(INK);
      write(formatNumber(seg.total), x + w, rowTop, { align: 'right' });
      bar(barX, rowTop + 2, barW, seg.total / max);
      ty = rowTop + 8.5;
    });
    if (segments.length > rows.length) {
      labelFont('normal');
      doc.setFontSize(7.5);
      setText(FAINT);
      write(`+ ${segments.length - rows.length} more segments`, x + 5, ty + 1);
    }
  }

  function drawTopZips(x: number, top: number, w: number, zips: TopZip[], scope: string) {
    eyebrow(`Top ${TOP_ZIP_DISPLAY_COUNT} ZIP codes · ${scope}`, x, top);
    let ty = top + 6;
    if (zips.length === 0) {
      labelFont('normal');
      doc.setFontSize(8.5);
      setText(MUTED);
      write('No ZIP data available.', x, ty + 2);
      return;
    }
    labelFont('normal');
    doc.setFontSize(7.5);
    setText(FAINT);
    write(`${Math.min(zips.length, TOP_ZIP_DISPLAY_COUNT)} shown`, x, ty);
    ty += 5;
    const max = zips[0]?.count ?? 1;

    // Same brand face for every cell. Fixed columns + equal-width digit slots so
    // proportional ZIP glyphs cannot shove "· City" left/right per row.
    labelFont('bold');
    doc.setFontSize(8);
    const digitSlot = Math.max(
      ...['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => doc.getTextWidth(d))
    );
    const rankW = digitSlot * 2 + 2.5;
    const zipW = digitSlot * 5 + 2;
    const zipX = x + rankW;
    const cityX = zipX + zipW;
    const countRight = x + w - 16;
    const cityMaxW = Math.max(18, countRight - cityX - 4);

    const writeDigits = (text: string, left: number, yPos: number) => {
      for (let i = 0; i < text.length; i++) {
        write(text[i]!, left + i * digitSlot, yPos);
      }
    };

    zips.slice(0, TOP_ZIP_DISPLAY_COUNT).forEach((z, i) => {
      const rowTop = ty;
      const zip = normalizeZipCode(z.zip) ?? z.zip;
      const city = zipLabels[zip]?.city?.trim();

      labelFont('bold');
      doc.setFontSize(8);
      setText(MUTED);
      writeDigits(String(i + 1).padStart(2, '0'), x, rowTop);

      setText(INK2);
      writeDigits(zip, zipX, rowTop);

      if (city) {
        labelFont('normal');
        doc.setFontSize(8);
        setText(INK2);
        const cityLabel = `· ${city}`;
        const clipped = doc.splitTextToSize(cityLabel, cityMaxW)[0] ?? cityLabel;
        write(clipped, cityX, rowTop);
      }

      labelFont('bold');
      doc.setFontSize(8);
      setText(INK);
      write(formatNumber(z.count), countRight, rowTop, { align: 'right' });
      labelFont('normal');
      doc.setFontSize(7.5);
      setText(FAINT);
      write(formatPercent(z.share), x + w, rowTop, { align: 'right' });
      bar(x, rowTop + 3.2, w, z.count / max);
      ty = rowTop + 9;
    });
  }

  return doc;
}
