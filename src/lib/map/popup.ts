export function audiencePopupHtml(options: {
  zip: string;
  typeLabel: string;
  count: number;
  accentColor: string;
}): string {
  const { zip, typeLabel, count, accentColor } = options;
  const formatted = count.toLocaleString('en-US');
  const safeZip = escapeHtml(String(zip));
  const safeLabel = escapeHtml(typeLabel);

  return `<div class="mom-popup-inner">
    <p class="mom-popup-zip">${safeZip}</p>
    <p class="mom-popup-label">${safeLabel}</p>
    <p class="mom-popup-value" style="color:${accentColor}">${formatted}</p>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
