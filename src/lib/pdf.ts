import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import type { Layout } from './layout';
import { formatDimension } from './layout';
import type { ArtOptions } from './render';
import { createArtCanvas, renderTileCanvas } from './render';
import { type SafeSvg, trustedSvgElement, vectorFit } from './svg';
import { type BlueprintOptions, formatPosterCoordinate, gridLinesForTile, GRID_INK_RGB } from './blueprint';

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

function drawBlueprintGrid(
  doc: jsPDF,
  layout: Layout,
  tile: Layout['tiles'][number],
  marginX: number,
  marginY: number,
  blueprint: BlueprintOptions,
): void {
  if (blueprint.step === 'off') return;
  const lines = gridLinesForTile(tile, blueprint.step);
  const [r, g, b] = GRID_INK_RGB[blueprint.ink];
  // Draw physical grid lines as PDF VECTORS; artwork beneath remains raster.
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(.007);
  for (const x of lines.x) {
    const local = marginX + x - tile.x;
    doc.line(local, marginY, local, marginY + tile.height);
  }
  for (const y of lines.y) {
    const local = marginY + y - tile.y;
    doc.line(marginX, local, marginX + tile.width, local);
  }

  if (blueprint.coordinates) {
    const xStart = formatPosterCoordinate(tile.x, blueprint.step);
    const xEnd = formatPosterCoordinate(tile.x + tile.width, blueprint.step);
    const yStart = formatPosterCoordinate(tile.y, blueprint.step);
    const yEnd = formatPosterCoordinate(tile.y + tile.height, blueprint.step);
    doc.setTextColor(48, 61, 73);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const footerY = layout.pageHeight - Math.max(.12, marginY * .4);
    doc.text('GRID ORIGIN: TOP-LEFT   X ' + xStart + ' to ' + xEnd +
      '   |   Y ' + yStart + ' to ' + yEnd, marginX, footerY);
  }
}

export interface ExportParams {
  image: HTMLImageElement;
  layout: Layout;
  options: ArtOptions;
  includeGuide: boolean;
  selectedIndex?: number;
  blueprint?: BlueprintOptions;
  svgSource?: SafeSvg | null;
  onProgress: (done: number, total: number) => void;
}

export async function exportPosterPDF({ image, layout, options, includeGuide, selectedIndex, blueprint, svgSource, onProgress }: ExportParams): Promise<void> {
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
  const renderVector = !!svgSource && options.effect === 'original';
  // SVG can depend on computed DOM style. Attach ONLY our rebuilt allowlisted XML
  // offscreen for the duration of the export. It contains no links or embedded assets.
  const svgHost = renderVector ? document.createElement('div') : null;
  let safeSvgElement: SVGSVGElement | null = null;
  if (svgHost && svgSource) {
    svgHost.style.cssText = 'position:fixed;left:-200vw;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;';
    safeSvgElement = trustedSvgElement(svgSource.markup);
    svgHost.appendChild(safeSvgElement);
    document.body.appendChild(svgHost);
  }
  try {
  for (const [tileOffset, tile] of tiles.entries()) {
    if (addGuide || tileOffset > 0) doc.addPage([layout.pageWidth, layout.pageHeight], orientation);
    const marginX = (layout.pageWidth - layout.usableWidth) / 2;
    const marginY = (layout.pageHeight - layout.usableHeight) / 2;
    if (renderVector && safeSvgElement && svgSource) {
      // All poster positions are in physical inches, including crop, overlap and margins.
      const fit = vectorFit(svgSource.aspectWidth, svgSource.aspectHeight,
        options.posterWidth, options.posterHeight, options.fit);
      doc.saveGraphicsState();
      doc.rect(marginX, marginY, tile.width, tile.height, null);
      doc.clip();
      doc.discardPath();
      const background = /^#[0-9a-f]{6}$/i.test(options.paperColor) ? options.paperColor : '#ffffff';
      doc.setFillColor(background);
      doc.rect(marginX, marginY, tile.width, tile.height, 'F');
      await doc.svg(safeSvgElement, {
        x: marginX - tile.x + fit.x,
        y: marginY - tile.y + fit.y,
        width: fit.width,
        height: fit.height,
      });
      doc.restoreGraphicsState();
    } else {
      const canvas = renderTileCanvas(image, processed, layout, tile, options, dpi);
      const jpeg = canvas.toDataURL('image/jpeg', .9);
      doc.addImage(jpeg, 'JPEG', marginX, marginY, layout.usableWidth, layout.usableHeight);
    }
    if (blueprint) drawBlueprintGrid(doc, layout, tile, marginX, marginY, blueprint);
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
  } finally {
    svgHost?.remove();
  }
  const suffix = selectedIndex === undefined ? '' : '-sheet-' + selectedIndex;
  doc.save('rastaphi-' + formatDimension(options.posterWidth) + 'x' +
    formatDimension(options.posterHeight) + 'in' + suffix + '.pdf');
}
