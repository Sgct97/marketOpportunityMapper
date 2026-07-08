import type { ZipSegmentMetric } from '@/lib/audience/zip-exclude';
import { formatZipDisplay, formatZipDisplayTitle } from '@/lib/map/zip-labels';
import type { ZipLabel } from '@/lib/map/zip-labels';
import { formatNumber } from '@/lib/format';

type PopupTheme = 'dark' | 'light';

const POPUP_THEME: Record<
  PopupTheme,
  {
    ink: string;
    faint: string;
    rowBorder: string;
    badgeBg: string;
    badgeBorder: string;
    badgeInk: string;
    excludedBadgeBg: string;
    excludedBadgeBorder: string;
    excludedBadgeInk: string;
  }
> = {
  light: {
    ink: '#0f172a',
    faint: '#64748b',
    rowBorder: '#e2e8f0',
    badgeBg: '#eff6ff',
    badgeBorder: '#bfdbfe',
    badgeInk: '#1d4ed8',
    excludedBadgeBg: '#f8fafc',
    excludedBadgeBorder: '#e2e8f0',
    excludedBadgeInk: '#64748b',
  },
  dark: {
    ink: '#f8fafc',
    faint: '#94a3b8',
    rowBorder: 'rgba(255, 255, 255, 0.12)',
    badgeBg: 'rgba(59, 130, 246, 0.16)',
    badgeBorder: 'rgba(96, 165, 250, 0.35)',
    badgeInk: '#93c5fd',
    excludedBadgeBg: 'rgba(255, 255, 255, 0.06)',
    excludedBadgeBorder: 'rgba(255, 255, 255, 0.12)',
    excludedBadgeInk: '#94a3b8',
  },
};

function segmentTableHtml(
  segments: ZipSegmentMetric[],
  accentColor: string,
  ink: string,
  rowBorder: string
): string {
  const rows = segments
    .map(seg => {
      const safeName = escapeHtml(seg.name);
      return `<tr>
        <td style="width:70%;padding:6px 10px 6px 0;border-bottom:1px solid ${rowBorder};font-size:12px;font-weight:500;line-height:1.4;color:${ink};word-break:break-word;overflow-wrap:anywhere;vertical-align:top;">${safeName}</td>
        <td style="width:30%;padding:6px 0;border-bottom:1px solid ${rowBorder};font-size:13px;font-weight:700;color:${accentColor};font-variant-numeric:tabular-nums;text-align:right;vertical-align:top;white-space:nowrap;">${formatNumber(seg.count)}</td>
      </tr>`;
    })
    .join('');

  return `<table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-top:6px;">${rows}</table>`;
}

export function audiencePopupHtml(options: {
  zip: string;
  typeLabel: string;
  count: number;
  accentColor: string;
  segments: ZipSegmentMetric[];
  excluded: boolean;
  theme?: PopupTheme;
  zipLabels?: Record<string, ZipLabel>;
}): string {
  const { zip, count, accentColor, segments, excluded, theme = 'dark', zipLabels } = options;
  const palette = POPUP_THEME[theme];
  const zipHeading = escapeHtml(formatZipDisplay(zip, zipLabels));
  const zipTitle = escapeHtml(formatZipDisplayTitle(zip, zipLabels));
  const total = count > 0 ? count : segments.reduce((sum, seg) => sum + seg.count, 0);

  const badgeStyle = excluded
    ? `padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${palette.excludedBadgeInk};background:${palette.excludedBadgeBg};border:1px solid ${palette.excludedBadgeBorder};`
    : `padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${palette.badgeInk};background:${palette.badgeBg};border:1px solid ${palette.badgeBorder};`;

  return `<div class="mom-popup-inner mom-popup-inner--zip" data-theme="${theme}" style="width:400px;max-width:min(400px,92vw);padding:12px 14px 11px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-sizing:border-box;overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <span style="font-size:16px;font-weight:700;letter-spacing:0.02em;color:${palette.ink};font-variant-numeric:tabular-nums;" title="${zipTitle}">${zipHeading}</span>
      <span style="${badgeStyle}">${excluded ? 'Excluded' : 'Included'}</span>
    </div>

    <div style="margin-top:8px;font-size:26px;font-weight:700;line-height:1.15;color:${accentColor};font-variant-numeric:tabular-nums;${excluded ? 'opacity:0.55;' : ''}">
      ${formatNumber(total)}
      <span style="display:inline-block;margin-left:7px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${palette.faint};">total audience</span>
    </div>

    ${
      segments.length > 0
        ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid ${palette.rowBorder};overflow:hidden;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${palette.faint};margin-bottom:2px;">Segments</div>
            ${segmentTableHtml(segments, accentColor, palette.ink, palette.rowBorder)}
          </div>`
        : `<p style="margin:10px 0 0;font-size:11px;color:${palette.faint};">No segment detail for this ZIP.</p>`
    }
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
