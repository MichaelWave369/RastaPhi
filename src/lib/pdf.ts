import { jsPDF } from 'jspdf';
import type { Layout } from './layout';
import { formatDimension } from './layout';
import type { ArtOptions } from './render';
import { createArtCanvas, renderTileCanvas } from './render';

function makeGuide(doc: jsPDF, layout: Layout, opts: ArtOptions) {
  const pw = layout.pageWidth;
  const ph = layout.pageHeight;
  const x = 0.62;
  doc.setFillColor(22, 27, 36);
  doc.rect(0, 0, pw, 1.2, 'F');
  doc.setTextColor(245, 236, 215);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('RastaPhi / Assembly map', x, .62);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('THINK BIG. PRINT SMALL. BUILD HUGE.', x, .95);
  doc.setTextColor(30, 39, 52);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDimension(opts.posterWidth) + ' x ' + formatDimension(opts.posterHeight) + ' inches', x, 1.63);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(layout.columns + ' columns / ' + layout.rows + ' rows / ' + layout.total + ' printable sheets', x, 1.91);

  const gap = .055;
  const maxW = pw - 1.24;
  const maxH = Math.max(1.6, ph - 5.4);
  const cellW = Math.min(.77, (maxW - (layout.columns - 1) * gap) / layout.columns,
    (maxH - (layout.rows - 1) * gap) / layout.rows * layout.usableWidth / layout.usableHeight);
  const cellH = cellW * layout.usableHeight / layout.usableWidth;
  const originX = (pw - (cellW * layout.columns + gap * (layout.columns - 1))) / 2;
  const originY = 2.3;
  for (const t of layout.tiles) {
    const tx = originX + t.col * (cellW + gap);
    const ty = originY + t.row * (cellH + gap);
    doc.setFillColor((t.row + t.col) % 2 ? 232 : 245, 238, 223);
    doc.setDrawColor(125, 130, 143);
    doc.setLineWidth(.008);
    doc.rect(tx, ty, cellW, cellH, 'FD');
    if (cellW > .22 && cellH > .18) {
      doc.setFontSize(Math.max(4, Math.min(10, cellW * 13)));
      doc.text(String(t.index), tx + cellW / 2, ty + cellH / 2 + .03, { align: 'center' });
    }
  }

  const bottom = ph - 2.35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Assembly instructions', x, bottom);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const instructions = [
    '1. Print at ACTUAL SIZE / 100%. Turn OFF Fit to Page or Shrink to Fit.',
    '2. Check the calibration square below. It must measure exactly 1 inch.',
    '3. Trim right and bottom edges as needed; keep the overlap for alignment.',
    '4. Arrange sheets left to right, top to bottom using the page labels.',
  ];
  instructions.forEach((line, i) => doc.text(line, x, bottom + .28 + i * .19, { maxWidth: pw - 1.1 }));
  doc.setDrawColor(30, 39, 52);
  doc.setLineWidth(.014);
  doc.rect(x, ph - 1.33, 1, 1);
  doc.setFontSize(8);
  doc.text('1 x 1 inch', x + 1.12, ph - .84);
  doc.setTextColor(105, 110, 121);
  doc.text('Made locally in your browser. No uploads.  rastaphi', x, ph - .12);
}

export interface ExportParams {
  image: HTMLImageElement;
  layout: Layout;
  options: ArtOptions;
  includeGuide: boolean;
  selectedIndex?: number;
  onProgress: (done: number, total: number) => void;
}

export async function exportPosterPDF({ image, layout, options, includeGuide, selectedIndex, onProgress }: ExportParams): Promise<void> {
  const tiles = selectedIndex === undefined ? layout.tiles : layout.tiles.filter(tile => tile.index === selectedIndex);
  if (!tiles.length) throw new Error('Selected sheet is no longer in the poster layout.');
  const addGuide = includeGuide && selectedIndex === undefined;
  const orientation = layout.pageWidth > layout.pageHeight ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'in',
    format: [layout.pageWidth, layout.pageHeight],
    compress: true,
    precision: 5,
  });
  doc.setProperties({
    title: 'RastaPhi wall poster',
    subject: 'Tiled wall artwork with print-at-100-percent assembly information',
    creator: 'RastaPhi',
  });
  if (addGuide) makeGuide(doc, layout, options);

  // Process global stylized art once, so halftone dots NEVER reset at page seams.
  // Originals and monochrome photos use the full-resolution image instead.
  const processed = options.effect === 'halftone' || options.effect === 'duotone'
    ? createArtCanvas(image, options, 3200)
    : null;
  const dpi = 135;
  for (const [tileOffset, tile] of tiles.entries()) {
    if (addGuide || tileOffset > 0) doc.addPage([layout.pageWidth, layout.pageHeight], orientation);
    const canvas = renderTileCanvas(image, processed, layout, tile, options, dpi);
    const jpeg = canvas.toDataURL('image/jpeg', .9);
    doc.addImage(jpeg, 'JPEG',
      (layout.pageWidth - layout.usableWidth) / 2,
      (layout.pageHeight - layout.usableHeight) / 2,
      layout.usableWidth, layout.usableHeight);
    const marginX = (layout.pageWidth - layout.usableWidth) / 2;
    const marginY = (layout.pageHeight - layout.usableHeight) / 2;
    doc.setDrawColor(45, 54, 68);
    doc.setLineWidth(.008);
    const mark = .14;
    const corners = [
      [marginX, marginY, -1, -1],
      [marginX + tile.width, marginY, 1, -1],
      [marginX, marginY + tile.height, -1, 1],
      [marginX + tile.width, marginY + tile.height, 1, 1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      doc.line(cx + dx * mark, cy, cx + dx * .035, cy);
      doc.line(cx, cy + dy * mark, cx, cy + dy * .035);
    }
    doc.setTextColor(43, 53, 65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('RASTAPHI  /  R' + (tile.row + 1) + ' C' + (tile.col + 1) + '  /  ' +
      tile.index + ' of ' + layout.total, marginX, Math.max(.12, marginY * .52));
    onProgress(tileOffset + 1, tiles.length);
    // Yield between pages: UI remains responsive and progress is visible.
    if (tileOffset % 2 === 1) await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  const suffix = selectedIndex === undefined ? '' : '-sheet-' + selectedIndex;
  doc.save('rastaphi-' + formatDimension(options.posterWidth) + 'x' +
    formatDimension(options.posterHeight) + 'in' + suffix + '.pdf');
}
