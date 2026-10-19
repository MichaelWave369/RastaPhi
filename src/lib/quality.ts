import type { Fit } from './layout';

export type QualityBand = 'good' | 'fair' | 'soft';

export function sourcePixelsPerInch(
  imageWidthPx: number,
  imageHeightPx: number,
  posterWidthIn: number,
  posterHeightIn: number,
  fit: Fit,
): number {
  if (![imageWidthPx, imageHeightPx, posterWidthIn, posterHeightIn].every(n => Number.isFinite(n) && n > 0)) return 0;
  // The displayed image uses this many real-world inches for every source pixel.
  // Cover crops; contain letterboxes. In both cases source image pixels are never invented.
  const inchesPerSourcePixel = fit === 'cover'
    ? Math.max(posterWidthIn / imageWidthPx, posterHeightIn / imageHeightPx)
    : Math.min(posterWidthIn / imageWidthPx, posterHeightIn / imageHeightPx);
  return 1 / inchesPerSourcePixel;
}

export function printQualityBand(ppi: number): QualityBand {
  if (ppi >= 150) return 'good';
  if (ppi >= 75) return 'fair';
  return 'soft';
}

export function qualityDescription(ppi: number): string {
  if (ppi <= 0) return 'Load a photo to check print resolution.';
  switch (printQualityBand(ppi)) {
    case 'good': return 'Good source detail for this poster size.';
    case 'fair': return 'Moderate detail. Best enjoyed from a few steps back.';
    case 'soft': return 'Soft source detail. Try a smaller poster or use the DotLab effect.';
  }
}
