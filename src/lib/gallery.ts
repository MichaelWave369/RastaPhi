export interface GalleryConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  showQr: boolean;
}

export interface GalleryCaption {
  title?: string;
  artist?: string;
  url?: string;
}

const controlChars = /[\u0000-\u001f\u007f]/;

export function cleanGalleryText(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max || controlChars.test(value)) {
    throw new Error('Gallery text is invalid or too long.');
  }
  return value.trim();
}

/** Only literal HTTPS URLs are permitted in QR codes. No remote fetching occurs. */
export function validateGalleryLink(value: unknown): string {
  const raw = cleanGalleryText(value, 350);
  if (!raw) return '';
  if (!/^https:\/\//i.test(raw) || /[\s<>]/.test(raw)) {
    throw new Error('Gallery QR links must be complete HTTPS addresses.');
  }
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error('Invalid QR destination.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new Error('QR destinations must be public HTTPS links without embedded credentials.');
  }
  return raw;
}

export function validateGalleryConfig(value: unknown): GalleryConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Gallery settings are invalid.');
  }
  const g = value as Partial<GalleryConfig>;
  if (typeof g.enabled !== 'boolean' || typeof g.showQr !== 'boolean') {
    throw new Error('Gallery switches must be set explicitly.');
  }
  const title = cleanGalleryText(g.title, 90);
  const subtitle = cleanGalleryText(g.subtitle, 140);
  return { enabled: g.enabled, showQr: g.showQr, title, subtitle };
}

export function galleryInk(bg: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(bg)) return '#151b24';
  const [r,g,b] = [1,3,5].map(i => parseInt(bg.slice(i,i+2),16));
  return r*.2126 + g*.7152 + b*.0722 > 145 ? '#171e2c' : '#faf8ef';
}

export function galleryHeaderHeight(totalHeight: number, active: boolean): number {
  return active ? totalHeight * .125 : 0;
}

export function galleryLabelHeight(cellHeight: number, active: boolean): number {
  return active ? cellHeight * .25 : 0;
}

export function shortenText(ctx: { measureText(text: string): { width: number } }, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let left = 0, right = value.length;
  while (left < right) {
    const mid = Math.ceil((left + right) / 2);
    if (ctx.measureText(value.slice(0,mid) + '…').width <= maxWidth) left = mid;
    else right = mid - 1;
  }
  return value.slice(0, left) + '…';
}
