function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function dealershipPopupHtml(options: {
  name: string;
  brand: string;
  role: 'client' | 'competitor';
  accentColor: string;
  isFocus?: boolean;
  rank?: number;
}): string {
  const { name, brand, role, accentColor, isFocus, rank } = options;
  const roleLabel =
    role === 'client'
      ? 'Client dealership'
      : rank != null
        ? `Competitor #${rank}`
        : 'Competitor';
  const safeName = escapeHtml(name);
  const safeBrand = escapeHtml(brand);

  return `<div class="mom-popup-inner">
    <p class="mom-popup-zip">${roleLabel}${isFocus ? ' · Focus' : ''}</p>
    <p class="mom-popup-label">${safeName}</p>
    <p class="mom-popup-value" style="color:${accentColor};font-size:14px">${safeBrand}</p>
  </div>`;
}
