export type Paper = 'letter' | 'a4' | 'a3';
export type Orientation = 'portrait' | 'landscape';
export type Fit = 'cover' | 'contain';
export type Effect = 'original' | 'mono' | 'duotone' | 'halftone';

export const PAPER_INCHES: Record<Paper, [number, number]> = {
  letter: [8.5, 11],
  a4: [8.2677165, 11.6929134],
  a3: [11.6929134, 16.5354331],
};

export interface LayoutOptions {
  posterWidth: number;
  posterHeight: number;
  paper: Paper;
  orientation: Orientation;
  margin: number;
  overlap: number;
}

export interface Tile {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

export interface Layout {
  pageWidth: number;
  pageHeight: number;
  usableWidth: number;
  usableHeight: number;
  stepX: number;
  stepY: number;
  columns: number;
  rows: number;
  total: number;
  tiles: Tile[];
}

export function buildLayout(opts: LayoutOptions): Layout {
  const { posterWidth, posterHeight, margin, overlap, orientation, paper } = opts;
  if (!Number.isFinite(posterWidth) || !Number.isFinite(posterHeight) ||
      posterWidth <= 0 || posterHeight <= 0) {
    throw new Error('Poster dimensions must be greater than zero.');
  }
  const [short, long] = PAPER_INCHES[paper];
  if (!short || !long) throw new Error('Unknown paper size.');
  const pageWidth = orientation === 'portrait' ? short : long;
  const pageHeight = orientation === 'portrait' ? long : short;
  const usableWidth = pageWidth - 2 * margin;
  const usableHeight = pageHeight - 2 * margin;
  if (margin < 0 || !Number.isFinite(margin) || usableWidth <= 0 || usableHeight <= 0) {
    throw new Error('Margins leave no printable area.');
  }
  if (!Number.isFinite(overlap) || overlap < 0 ||
      overlap >= usableWidth || overlap >= usableHeight) {
    throw new Error('Overlap must be smaller than the printable area.');
  }
  const stepX = usableWidth - overlap;
  const stepY = usableHeight - overlap;
  const columns = Math.max(1, Math.ceil(Math.max(0, posterWidth - usableWidth - 1e-9) / stepX) + 1);
  const rows = Math.max(1, Math.ceil(Math.max(0, posterHeight - usableHeight - 1e-9) / stepY) + 1);
  if (columns * rows > 300) throw new Error('This design exceeds the 300-sheet safety limit.');
  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * stepX;
      const y = row * stepY;
      tiles.push({
        index: tiles.length + 1,
        row,
        col,
        x,
        y,
        width: Math.min(usableWidth, posterWidth - x),
        height: Math.min(usableHeight, posterHeight - y),
      });
    }
  }
  return { pageWidth, pageHeight, usableWidth, usableHeight, stepX, stepY, columns, rows, total: tiles.length, tiles };
}

export const inchesToCm = (inches: number) => inches * 2.54;
export const inchesToFeet = (inches: number) => inches / 12;
export const formatDimension = (value: number) => value.toFixed(1).replace(/\.0$/, '');
