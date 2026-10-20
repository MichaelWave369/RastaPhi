import type { Fit } from './layout';
import QRCode from 'qrcode';
import {
  type GalleryConfig, cleanGalleryText, galleryHeaderHeight, galleryInk,
  galleryLabelHeight, shortenText, validateGalleryConfig, validateGalleryLink,
} from './gallery';

export const MAX_MOSAIC_PHOTOS = 12;
export const MAX_MOSAIC_DATA = 38 * 1024 * 1024;
const maxImageLength = 6 * 1024 * 1024;

export interface MosaicPhoto {
  name: string;
  dataUrl: string;
  title?: string;
  artist?: string;
  url?: string;
}

export interface MosaicRecipe {
  kind: 'mosaic';
  name: string;
  photos: MosaicPhoto[];
  columns: number;
  gapPercent: number;
  background: string;
  fit: Fit;
  gallery?: GalleryConfig;
}

const rasterUrl = /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=\r\n]+$/;

export function validateMosaic(value: unknown): MosaicRecipe {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Not a valid MosaicLab project.');
  }
  const x = value as Partial<MosaicRecipe>;
  if (x.kind !== 'mosaic' || typeof x.name !== 'string' || !x.name.trim() || x.name.length > 160) {
    throw new Error('MosaicLab needs a valid collage name.');
  }
  if (!Array.isArray(x.photos) || x.photos.length < 1 || x.photos.length > MAX_MOSAIC_PHOTOS) {
    throw new Error('MosaicLab requires between 1 and 12 photos.');
  }
  if (typeof x.columns !== 'number' || !Number.isInteger(x.columns) || x.columns < 1 || x.columns > 6 ||
      typeof x.gapPercent !== 'number' || !Number.isFinite(x.gapPercent) || x.gapPercent < 0 || x.gapPercent > 8 ||
      !/^#[0-9a-fA-F]{6}$/.test(x.background || '') ||
      !['cover', 'contain'].includes(x.fit || '')) {
    throw new Error('Invalid MosaicLab grid or style settings.');
  }
  let total = 0;
  for (const photo of x.photos) {
    if (!photo || typeof photo !== 'object' || typeof photo.name !== 'string' ||
        photo.name.length < 1 || photo.name.length > 160 ||
        !rasterUrl.test(photo.dataUrl) || photo.dataUrl.length > maxImageLength) {
      throw new Error('MosaicLab contains an invalid or oversized embedded photo.');
    }
    total += photo.dataUrl.length;
  }
  if (total > MAX_MOSAIC_DATA) throw new Error('Combined MosaicLab photos exceed the 38 MB limit.');
  if (x.gallery !== undefined) validateGalleryConfig(x.gallery);
  for (const photo of x.photos) {
    if (photo.title !== undefined) cleanGalleryText(photo.title, 90);
    if (photo.artist !== undefined) cleanGalleryText(photo.artist, 80);
    if (photo.url !== undefined) validateGalleryLink(photo.url);
  }
  return x as MosaicRecipe;
}

export function mosaicCells(count: number, columns: number, width: number, height: number, gapPercent: number) {
  if (![count, columns, width, height, gapPercent].every(Number.isFinite) ||
      count < 1 || count > MAX_MOSAIC_PHOTOS || !Number.isInteger(count) ||
      !Number.isInteger(columns) || columns < 1 || columns > 6 || width <= 0 || height <= 0 ||
      gapPercent < 0 || gapPercent > 8) throw new Error('Invalid collage geometry.');
  const cols = Math.min(columns, count);
  const rows = Math.ceil(count / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const gap = Math.min(cellWidth, cellHeight) * gapPercent / 100;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / cols), col = index % cols;
    return {
      index, row, col,
      x: col * cellWidth + gap / 2,
      y: row * cellHeight + gap / 2,
      width: cellWidth - gap,
      height: cellHeight - gap,
    };
  });
}

function loadDataImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('One of the collage photos could not be decoded.'));
    image.src = src;
  });
}

export async function optimizeMosaicFile(file: File): Promise<MosaicPhoto> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('MosaicLab accepts PNG, JPEG, or WebP photos.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Each source photo must be under 10 MB.');
  const originalUrl = URL.createObjectURL(file);
  try {
    const image = await loadDataImage(originalUrl);
    const scale = Math.min(1, 1700 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable for processing collage photos.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    // JPEG is consistently supported in browsers and keeps portable project size bounded.
    const dataUrl = canvas.toDataURL('image/jpeg', .85);
    if (dataUrl.length > maxImageLength) throw new Error('Compressed photo exceeds the per-photo project limit.');
    return { name: file.name.slice(0, 160), dataUrl };
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

export async function composeMosaic(
  recipe: MosaicRecipe, posterWidth: number, posterHeight: number,
): Promise<HTMLImageElement> {
  validateMosaic(recipe);
  if (![posterWidth, posterHeight].every(v => Number.isFinite(v) && v > 0)) {
    throw new Error('Choose a valid poster size before composing the collage.');
  }
  const width = Math.max(1, Math.round(3000 * posterWidth / Math.max(posterWidth, posterHeight)));
  const height = Math.max(1, Math.round(3000 * posterHeight / Math.max(posterWidth, posterHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas could not render this collage.');
  ctx.fillStyle = recipe.background;
  ctx.fillRect(0, 0, width, height);
  const gallery = recipe.gallery?.enabled ? recipe.gallery : null;
  const header = galleryHeaderHeight(height, !!gallery);
  const cells = mosaicCells(recipe.photos.length, recipe.columns, width, height - header, recipe.gapPercent);
  const images = await Promise.all(recipe.photos.map(p => loadDataImage(p.dataUrl)));
  const ink = galleryInk(recipe.background);
  if (gallery) {
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.font = 'bold ' + Math.max(20, Math.floor(header * .35)) + 'px Arial, sans-serif';
    ctx.fillText(shortenText(ctx, gallery.title || recipe.name, width * .91),
      width / 2, header * .49);
    if (gallery.subtitle) {
      ctx.font = Math.max(12, Math.floor(header * .14)) + 'px Arial, sans-serif';
      ctx.fillText(shortenText(ctx, gallery.subtitle, width * .9),
        width / 2, header * .75);
    }
    ctx.textAlign = 'left';
  }
  const qrImages = gallery?.showQr ? await Promise.all(recipe.photos.map(async p => {
    if (!p.url) return null;
    const address = validateGalleryLink(p.url);
    if (!address) return null;
    // QR generation is entirely local. No destination is fetched.
    const qr = await QRCode.toDataURL(address, {
      errorCorrectionLevel: 'M', margin: 3, width: 256,
      color: { dark: '#141b23', light: '#ffffffff' },
    });
    return loadDataImage(qr);
  })) : [];

  cells.forEach((cell, i) => {
    const photo = recipe.photos[i];
    const image = images[i];
    const y = cell.y + header;
    const labelH = galleryLabelHeight(cell.height, !!gallery);
    const artH = cell.height - labelH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, y, cell.width, artH);
    ctx.clip();
    const ratio = recipe.fit === 'cover'
      ? Math.max(cell.width / image.naturalWidth, artH / image.naturalHeight)
      : Math.min(cell.width / image.naturalWidth, artH / image.naturalHeight);
    const dw = image.naturalWidth * ratio;
    const dh = image.naturalHeight * ratio;
    ctx.drawImage(image, cell.x + (cell.width - dw) / 2, y + (artH - dh) / 2, dw, dh);
    ctx.restore();
    if (!gallery) return;

    const labelY = y + artH;
    const padding = Math.max(8, Math.min(24, cell.width * .038));
    const qrSize = Math.min(labelH * .78, cell.width * .25);
    const qrPhysicalInches = qrSize / width * posterWidth;
    const qrAllowed = gallery.showQr && qrImages[i] &&
      qrSize >= 85 && qrPhysicalInches >= .95;
    const qrWidth = qrAllowed ? qrSize + padding : 0;
    const maxTextWidth = Math.max(10, cell.width - 2 * padding - qrWidth);
    const title = photo.title?.trim() || photo.name.replace(/.[^.]+$/, '');
    const fontSize = Math.max(9, Math.min(cell.width * .064, labelH * .31));
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
    ctx.fillText(shortenText(ctx, title, maxTextWidth), cell.x + padding, labelY + labelH * .39);
    if (photo.artist) {
      ctx.font = Math.max(8, fontSize * .63) + 'px Arial, sans-serif';
      ctx.fillText(shortenText(ctx, photo.artist.trim(), maxTextWidth),
        cell.x + padding, labelY + labelH * .72);
    }
    if (qrAllowed && qrImages[i]) {
      // Leave the QR quiet zone from the generator intact; don't overlay text.
      ctx.drawImage(qrImages[i], cell.x + cell.width - qrSize - padding,
        labelY + (labelH - qrSize) / 2, qrSize, qrSize);
    }
  });
  const image = await loadDataImage(canvas.toDataURL('image/jpeg', .93));
  return image;
}
