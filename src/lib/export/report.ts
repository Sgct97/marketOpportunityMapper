import { jsPDF } from 'jspdf';
import type { AgencyBrandConfig } from '@/lib/agency-brand';
import type { BrandConfig } from '@/lib/brands';
import type { DashboardModel, SegmentTotal, TopZip } from '@/lib/audience/dashboard';
import type { MapImage } from '@/lib/map/export-capture';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';

export type { MapImage };

export interface ReportInput {
  /** OEM / pitch accent — drives charts, KPIs, and map highlights. */
  brand: BrandConfig;
  /** Agency letterhead — logo, footer, and report chrome. */
  agencyBrand: AgencyBrandConfig;
  /** Pre-loaded logo data URL for jsPDF; omit to fall back to agency name text. */
  logoDataUrl?: string | null;
  projectName: string;
  datasetLabel: string | null;
  focusName: string | null;
  radiusMiles: number;
  model: DashboardModel;
  /** Captured map snapshot, or null if the map was unavailable. */
  mapImage: MapImage | null;
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
const HEADER_H = 42;

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
    projectName,
    datasetLabel,
    focusName,
    radiusMiles,
    model,
    mapImage,
  } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const accent = hexToRgb(brand.primaryColor);
  const agencyAccent = hexToRgb(agencyBrand.primaryColor);
  const accentSoft = tint(accent, 0.86);
  const accentLine = tint(accent, 0.62);

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
  const conc = useTradeArea
    ? { top5Share: tradeArea!.top5Share, zipsForHalf: tradeArea!.zipsForHalf }
    : { top5Share: model.concentration.top5Share, zipsForHalf: model.concentration.zipsForHalf };
  const topZips = useTradeArea ? tradeArea!.topZips : model.concentration.topZips;
  const topZipsScope = useTradeArea ? `Within ${radiusMiles} mi` : 'Across market';

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setFont('helvetica', 'normal');

  // ── helpers bound to this doc ──────────────────────────────────────────
  const setFill = (c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
  const setStroke = (c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);

  function eyebrow(text: string, x: number, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(FAINT);
    doc.text(text.toUpperCase(), x, y, { charSpace: 0.6 });
  }

  function drawHeaderBand(contextLine: string) {
    // Enterprise letterhead band: full-bleed accent rule, neutral surface, and a
    // structured lockup — agency logo (left) · report identity (center) · client
    // meta panel (right). The OEM accent ties the header to the report body.
    const bandMid = HEADER_H / 2;

    // Surface + full-bleed accent finish.
    setFill(tint(agencyAccent, 0.965));
    doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
    setFill(agencyAccent);
    doc.rect(0, 0, PAGE_W, 1.0, 'F');
    setFill(tint(agencyAccent, 0.55));
    doc.rect(0, 1.0, PAGE_W, 0.4, 'F');
    // Bottom border: soft accent band over a crisp hairline.
    setFill(tint(agencyAccent, 0.72));
    doc.rect(0, HEADER_H - 0.9, PAGE_W, 0.9, 'F');
    setStroke(LINE);
    doc.setLineWidth(0.2);
    doc.line(0, HEADER_H, PAGE_W, HEADER_H);

    // ── Left: agency logo, vertically centered ──
    const logoH = 12.5;
    const logoY = bandMid - logoH / 2;
    let lockX = MARGIN;
    let logoPlaced = false;
    if (logoDataUrl) {
      const logoW = logoH * agencyBrand.logoAspect;
      if (agencyBrand.headerBackgroundColor) {
        const pad = 2.6;
        setFill(hexToRgb(agencyBrand.headerBackgroundColor));
        doc.roundedRect(MARGIN - pad, logoY - pad, logoW + pad * 2, logoH + pad * 2, 1.6, 1.6, 'F');
      }
      try {
        doc.addImage(logoDataUrl, agencyBrand.logoFormat, MARGIN, logoY, logoW, logoH, undefined, 'FAST');
        lockX = MARGIN + logoW + 8;
        logoPlaced = true;
      } catch {
        logoPlaced = false;
      }
    }
    if (!logoPlaced) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      setText(hexToRgb(agencyBrand.textColor));
      doc.text(agencyBrand.name, MARGIN, bandMid + 1.5);
      lockX = MARGIN + doc.getTextWidth(agencyBrand.name) + 8;
    }

    // ── Vertical divider between letterhead and report identity ──
    setStroke(LINE);
    doc.setLineWidth(0.3);
    doc.line(lockX, logoY + 0.5, lockX, logoY + logoH - 0.5);
    const idX = lockX + 7;

    // ── Right: client/report meta panel — reserve its width first ──
    const panelW = 52;
    const panelX = PAGE_W - MARGIN - panelW;

    // Brand pill (OEM accent) — anchors the header to the accent-driven body.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const pillLabel = brand.name;
    const pillW = Math.min(panelW, doc.getTextWidth(pillLabel) + 11);
    const pillH = 7;
    const pillX = PAGE_W - MARGIN - pillW;
    const pillY = bandMid - pillH - 1.2;
    setFill(accentSoft);
    setStroke(accentLine);
    doc.setLineWidth(0.25);
    doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, 'FD');
    setFill(accent);
    doc.circle(pillX + 3.6, pillY + pillH / 2, 1.05, 'F');
    setText(accent);
    doc.text(pillLabel, pillX + 6.4, pillY + pillH / 2 + 1, { maxWidth: pillW - 8 });

    // Meta key/value rows under the pill, right-aligned and consistent.
    const metaY = bandMid + 3.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    setText(FAINT);
    doc.text('GENERATED', PAGE_W - MARGIN, metaY, { align: 'right', charSpace: 0.5 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(INK2);
    doc.text(formatDate(generatedAt), PAGE_W - MARGIN, metaY + 4.6, { align: 'right' });

    // ── Center: report identity lockup, filling the band ──
    const idMaxW = panelX - 6 - idX;
    setFill(accent);
    doc.circle(idX + 0.9, bandMid - 6.4, 0.85, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(FAINT);
    doc.text('MARKET OPPORTUNITY REPORT', idX + 3.4, bandMid - 5.6, { charSpace: 0.6 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setText(INK);
    const titleLine = doc.splitTextToSize(projectName, idMaxW)[0] ?? projectName;
    doc.text(titleLine, idX, bandMid + 1.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(MUTED);
    const ctx = datasetLabel ? `${contextLine}   ·   ${datasetLabel}` : contextLine;
    const ctxLine = doc.splitTextToSize(ctx, idMaxW)[0] ?? ctx;
    doc.text(ctxLine, idX, bandMid + 7.2);
  }

  function footer(pageLabel: string) {
    setStroke(LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(FAINT);
    doc.text(agencyBrand.name, MARGIN, PAGE_H - 9);
    doc.text(pageLabel, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
  }

  // KPI card
  function kpiCard(x: number, y: number, w: number, h: number, label: string, value: string, sub: string, badge?: string) {
    setFill(SURFACE);
    setStroke(LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
    eyebrow(label, x + 5, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    setText(INK);
    doc.text(value, x + 5, y + 18);
    if (badge) {
      const bw = doc.getTextWidth(badge) + 6;
      setFill(accentSoft);
      doc.roundedRect(x + w - bw - 5, y + 11.5, bw, 6.5, 3.25, 3.25, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setText(accent);
      doc.text(badge, x + w - bw - 5 + bw / 2, y + 16, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(MUTED);
    const subLines = doc.splitTextToSize(sub, w - 10);
    doc.text(subLines.slice(0, 2), x + 5, y + 25);
  }

  // Horizontal proportion bar
  function bar(x: number, y: number, w: number, ratio: number) {
    setFill(tint(LINE, 0.3));
    doc.roundedRect(x, y, w, 2.2, 1.1, 1.1, 'F');
    const fw = Math.max(1.5, Math.min(w, w * ratio));
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
    const r = diameter / 2 - thickness / 2;
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
    // Center label: top bucket share + facet title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    setText(INK);
    doc.text(buckets[0] ? formatPercent(buckets[0].share) : '—', cx, cy + 0.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    setText(FAINT);
    doc.text(title.toUpperCase(), cx, cy + 5, { align: 'center', charSpace: 0.4 });
  }

  // ═══════════════════════ PAGE 1 — Story & metrics ═══════════════════════
  drawHeaderBand(useTradeArea ? `${subjectName} · ${radiusMiles}-mi trade area` : 'Full-market view');

  let y = 52;

  // Hero — eyebrow, then the lead-segment headcount well below it.
  eyebrow(`Market opportunity · ${subjectName}`, MARGIN, y);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  setText(accent);
  const leadValue = leadSegment ? formatCompact(leadSegment.total) : '—';
  doc.text(leadValue, MARGIN, y);
  const leadW = doc.getTextWidth(leadValue);
  if (leadSegment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(accent);
    doc.text(`${formatPercent(leadSegment.share)} of reach`, MARGIN + leadW + 5, y - 2);
  }
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  setText(INK);
  const leadName = leadSegment ? leadSegment.name : 'No segments in file';
  const nameLines: string[] = doc.splitTextToSize(leadName, CONTENT_W);
  doc.text(nameLines, MARGIN, y);
  y += nameLines.length * 5.6 + 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(FAINT);
  doc.text(
    `Largest single audience${useTradeArea ? ' in the trade area' : ''} — a true headcount, not a sum.`,
    MARGIN,
    y
  );
  y += 8;
  doc.setFontSize(10);
  setText(INK2);
  const story = `Part of ${formatNumber(heroReach)} in total reach across ${model.segmentCount} segments ${
    useTradeArea ? `within ${subjectName}'s ${radiusMiles}-mi trade area` : 'across the market'
  }, spanning ${formatNumber(heroZips)} ZIP codes.`;
  const storyLines: string[] = doc.splitTextToSize(story, CONTENT_W);
  doc.text(storyLines, MARGIN, y);
  y += storyLines.length * 5 + 5;

  // Concentration callout
  setFill(accentSoft);
  setStroke(accentLine);
  doc.setLineWidth(0.2);
  const calloutText = `${formatPercent(conc.top5Share)} concentrated in the top 5 ZIPs  ·  ${formatNumber(
    conc.zipsForHalf
  )} ZIPs make up half the reach`;
  doc.roundedRect(MARGIN, y, CONTENT_W, 9, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(INK2);
  doc.text(calloutText, MARGIN + 4, y + 5.8);
  y += 16;

  // KPI row (2x2)
  const gap = 4;
  const kw = (CONTENT_W - gap) / 2;
  const kh = 28;
  kpiCard(
    MARGIN, y, kw, kh,
    'Total reach (all segments)',
    formatCompact(heroReach),
    `${model.segmentCount} segments · ${formatNumber(heroZips)} ZIPs · overlapping`,
    useTradeArea ? formatPercent(tradeArea!.share) : undefined
  );
  if (useTradeArea) {
    kpiCard(MARGIN + kw + gap, y, kw, kh, 'Full-market reach', formatCompact(model.totalAudience), `${formatNumber(model.totalZips)} ZIPs across the market`);
  } else {
    kpiCard(MARGIN + kw + gap, y, kw, kh, 'Lead segment share', model.topSegment ? formatPercent(model.topSegment.share) : '—', model.topSegment?.name ?? 'No segments');
  }
  y += kh + gap;
  kpiCard(MARGIN, y, kw, kh, 'Market concentration', formatPercent(conc.top5Share), `from the top 5 ZIPs · ${formatNumber(conc.zipsForHalf)} ZIPs make up half`);
  if (model.competitive.competitorCount > 0) {
    kpiCard(MARGIN + kw + gap, y, kw, kh, 'Competitive field', formatNumber(model.competitive.competitorCount), `rival stores · ${formatNumber(model.competitive.whiteSpace.length)} white-space ZIPs`);
  } else {
    kpiCard(MARGIN + kw + gap, y, kw, kh, 'Segments in file', formatNumber(model.segmentCount), 'distinct audience segments');
  }
  y += kh + 12;

  // Audience composition (up to 2 facets) — donut + legend, like the dashboard.
  const facets = model.composition.slice(0, 2);
  if (facets.length > 0) {
    eyebrow('Audience composition · grouped from segment names', MARGIN, y);
    y += 6;
    const cardH = 40;
    const fw = (CONTENT_W - gap) / 2;
    facets.forEach((facet, fi) => {
      const fx = MARGIN + fi * (fw + gap);
      setFill(SURFACE);
      setStroke(LINE);
      doc.setLineWidth(0.2);
      doc.roundedRect(fx, y, fw, cardH, 2.5, 2.5, 'FD');

      const buckets = facet.buckets.slice(0, 5);
      const dia = 30;
      const cx = fx + 6 + dia / 2;
      const cy = y + cardH / 2;
      drawDonut(cx, cy, dia, 7, buckets, buckets[0]?.label ?? '');

      // Legend
      const lx = fx + 6 + dia + 6;
      const lw = fx + fw - 5 - lx;
      const rowH = Math.min(7.5, (cardH - 8) / Math.max(1, buckets.length));
      let ly = y + (cardH - rowH * buckets.length) / 2 + rowH / 2;
      buckets.forEach((b, i) => {
        setFill(bucketColor(i));
        doc.circle(lx + 1.4, ly - 1, 1.4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setText(INK2);
        const label = doc.splitTextToSize(b.label, lw - 18)[0] ?? b.label;
        doc.text(label, lx + 5, ly);
        doc.setFont('helvetica', 'bold');
        setText(INK);
        doc.text(formatPercent(b.share), fx + fw - 5, ly, { align: 'right' });
        ly += rowH;
      });
    });
    y += cardH + 8;
  }

  footer(`Page 1 of ${mapImage ? 2 : 1}  ·  Generated ${formatDate(generatedAt)}`);

  // ═══════════════════════ PAGE 2 — Map & breakdown ══════════════════════
  if (mapImage) {
    doc.addPage();
    drawHeaderBand('Market map & segment detail');
    y = 50;

    // Map snapshot, aspect-fit within content width, capped height.
    eyebrow('Market map', MARGIN, y);
    y += 4;
    const ar = mapImage.height / mapImage.width;
    const imgW = CONTENT_W;
    const imgH = Math.min(110, imgW * ar);
    setStroke(LINE);
    doc.setLineWidth(0.3);
    try {
      doc.addImage(mapImage.dataUrl, 'PNG', MARGIN, y, imgW, imgH, undefined, 'FAST');
    } catch {
      // If the image can't be embedded, leave a labeled placeholder.
      setFill(SURFACE);
      doc.rect(MARGIN, y, imgW, imgH, 'F');
    }
    doc.rect(MARGIN, y, imgW, imgH, 'S');
    y += imgH + 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(MUTED);
    const caption = [
      useTradeArea ? `${subjectName} · ${radiusMiles}-mi trade area` : 'Full-market view',
      datasetLabel ? `Source: ${datasetLabel}` : null,
    ]
      .filter(Boolean)
      .join('   ·   ');
    doc.text(caption, MARGIN, y + 2);
    y += 10;

    // Two columns: segment breakdown (left) + top ZIPs (right)
    const colGap = 8;
    const leftW = CONTENT_W * 0.56;
    const rightW = CONTENT_W - leftW - colGap;
    const rightX = MARGIN + leftW + colGap;
    const tableTop = y;

    drawSegmentTable(MARGIN, tableTop, leftW, model.segments, model.totalAudience);
    drawTopZips(rightX, tableTop, rightW, topZips, topZipsScope);

    footer(`Page 2 of 2  ·  Generated ${formatDate(generatedAt)}`);
  }

  // ── nested table renderers (use the bound helpers above) ───────────────
  function drawSegmentTable(x: number, top: number, w: number, segments: SegmentTotal[], total: number) {
    eyebrow(`Audience segment breakdown · ${segments.length} segments`, x, top);
    let ty = top + 6;
    doc.setFontSize(7.5);
    setText(FAINT);
    doc.text(`Total audience ${formatNumber(total)}`, x, ty);
    ty += 5;
    const max = segments[0]?.total ?? 1;
    const rows = segments.slice(0, 16);
    rows.forEach((seg, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setText(MUTED);
      doc.text(String(i + 1), x, ty);
      doc.setFont('helvetica', 'normal');
      setText(INK2);
      const name = doc.splitTextToSize(seg.name, w - 34)[0] ?? seg.name;
      doc.text(name, x + 5, ty);
      doc.setFont('helvetica', 'bold');
      setText(INK);
      doc.text(formatNumber(seg.total), x + w, ty, { align: 'right' });
      ty += 2;
      bar(x + 5, ty, w - 5, seg.total / max);
      ty += 6.5;
    });
    if (segments.length > rows.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setText(FAINT);
      doc.text(`+ ${segments.length - rows.length} more segments`, x + 5, ty + 1);
    }
  }

  function drawTopZips(x: number, top: number, w: number, zips: TopZip[], scope: string) {
    eyebrow(`Top ZIP codes · ${scope}`, x, top);
    let ty = top + 8;
    if (zips.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setText(MUTED);
      doc.text('No ZIP data available.', x, ty);
      return;
    }
    const max = zips[0]?.count ?? 1;
    zips.slice(0, 8).forEach((z, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setText(i === 0 ? accent : FAINT);
      doc.text(String(i + 1), x, ty);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setText(INK2);
      doc.text(z.zip, x + 5, ty);
      doc.setFont('helvetica', 'bold');
      setText(INK);
      doc.text(formatNumber(z.count), x + w, ty, { align: 'right' });
      ty += 2;
      bar(x + 16, ty, w - 28, z.count / max);
      ty += 7;
    });
  }

  return doc;
}
