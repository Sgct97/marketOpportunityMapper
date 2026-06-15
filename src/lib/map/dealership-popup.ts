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
}): string {
  const { name, brand, role, accentColor, isFocus } = options;
  const roleLabel = role === 'client' ? 'Client dealership' : 'Competitor';
  const safeName = escapeHtml(name);
  const safeBrand = escapeHtml(brand);

  return `<div class="mom-popup-inner">
    <p class="mom-popup-zip">${roleLabel}${isFocus ? ' · Focus' : ''}</p>
    <p class="mom-popup-label">${safeName}</p>
    <p class="mom-popup-value" style="color:${accentColor};font-size:14px">${safeBrand}</p>
  </div>`;
}
