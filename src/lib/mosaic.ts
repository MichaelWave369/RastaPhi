import type { Fit } from './layout';

export const MAX_MOSAIC_PHOTOS = 12;
export const MAX_MOSAIC_DATA = 38 * 1024 * 1024;
const maxImageLength = 6 * 1024 * 1024;

export interface MosaicPhoto {
  name: string;
  dataUrl: string;
}

export interface MosaicRecipe {
  kind: 'mosaic';
  name: string;
  photos: MosaicPhoto[];
  columns: number;
  gapPercent: number;
  background: string;
  fit: Fit;
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
  const cells = mosaicCells(recipe.photos.length, recipe.columns, width, height, recipe.gapPercent);
  const images = await Promise.all(recipe.photos.map(p => loadDataImage(p.dataUrl)));
  cells.forEach((cell, i) => {
    const image = images[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.width, cell.height);
    ctx.clip();
    const ratio = recipe.fit === 'cover'
      ? Math.max(cell.width / image.naturalWidth, cell.height / image.naturalHeight)
      : Math.min(cell.width / image.naturalWidth, cell.height / image.naturalHeight);
    const dw = image.naturalWidth * ratio;
    const dh = image.naturalHeight * ratio;
    ctx.drawImage(image, cell.x + (cell.width - dw) / 2, cell.y + (cell.height - dh) / 2, dw, dh);
    ctx.restore();
  });
  const image = await loadDataImage(canvas.toDataURL('image/jpeg', .93));
  return image;
}
