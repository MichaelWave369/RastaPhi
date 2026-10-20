import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Layout } from './layout';
import type { MosaicRecipe } from './mosaic';
import { createExhibitManifest, placardPages, PLACARDS_PER_PAGE, type ExhibitItem } from './exhibit';

function textBlock(
  pdf: jsPDF, text: string, x: number, y: number, maxWidth: number,
  fontSize: number, maxLines: number,
): number {
  pdf.setFontSize(fontSize);
  const lines = pdf.splitTextToSize(text, maxWidth) as string[];
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    clipped[maxLines - 1] = clipped[maxLines - 1].replace(/\s+$/, '') + '…';
  }
  pdf.text(clipped, x, y);
  return y + clipped.length * fontSize / 72 * 1.3;
}

function addTitleCard(doc: jsPDF, title: string, subtitle: string, count: number, pw: number, ph: number) {
  doc.setFillColor(21, 29, 39);
  doc.rect(0, 0, pw, ph, 'F');
  doc.setTextColor(240, 194, 117);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RASTAPHI   /   EXHIBITION KIT', .8, .95);
  doc.setDrawColor(240, 194, 117);
  doc.setLineWidth(.025);
  doc.line(.8, 1.2, pw - .8, 1.2);

  doc.setTextColor(255, 250, 238);
  doc.setFont('helvetica', 'bold');
  textBlock(doc, title, .8, Math.max(2.3, ph * .37), pw - 1.6,
    pw < 10 ? 29 : 38, 4);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(205, 219, 217);
    textBlock(doc, subtitle, .8, Math.max(4.0, ph * .59), pw - 1.6, 13, 3);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(240, 194, 117);
  doc.text(count + ' WORKS  /  A PHYSICAL + DIGITAL EXHIBITION', .8, ph - 1.0);
  doc.setTextColor(169, 178, 179);
  doc.setFontSize(8);
  doc.text('Print at Actual Size / 100%. Printed QR links should be tested before display.', .8, ph - .56);
}

async function addPlacard(
  doc: jsPDF, item: ExhibitItem, top: number,
  pw: number, cardHeight: number, showQr: boolean,
) {
  const left = .65;
  const right = pw - .65;
  const cardWidth = right - left;
  const padding = .29;
  const contentY = top + .40;
  const qrSize = Math.min(1.55, cardHeight - 1.05, cardWidth * .22);
  doc.setDrawColor(155, 160, 156);
  doc.setLineWidth(.012);
  doc.roundedRect(left, top, cardWidth, cardHeight, .07, .07, 'S');
  doc.setFillColor(24, 34, 42);
  doc.rect(left, top, cardWidth, .23, 'F');

  const x = left + padding;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(83, 99, 101);
  doc.setFontSize(9);
  doc.text('WORK ' + String(item.number).padStart(2, '0'), x, contentY);
  const withQr = showQr && !!item.url && qrSize >= 1.1;
  const textWidth = cardWidth - 2 * padding - (withQr ? qrSize + .33 : 0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 35, 44);
  const y = textBlock(doc, item.title, x, contentY + .44, textWidth, 17, 3);
  if (item.credit) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(78, 92, 97);
    textBlock(doc, item.credit, x, Math.max(contentY + 1.13, y + .12), textWidth, 11, 2);
  }
  if (withQr) {
    const qr = await QRCode.toDataURL(item.url, {
      width: 512,
      errorCorrectionLevel: 'H',
      margin: 4,
      color: { dark: '#14232eff', light: '#ffffffff' },
    });
    const qrX = right - padding - qrSize;
    const qrY = top + (cardHeight - qrSize) / 2;
    doc.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.link(qrX, qrY, qrSize, qrSize, { url: item.url });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(83, 96, 97);
    doc.text('SCAN TO EXPLORE', qrX + qrSize / 2, qrY + qrSize + .17, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(118, 130, 131);
  doc.text('RASTAPHI  /  GALLERY COMPOSER', x, top + cardHeight - .24);
}

/**
 * Gallery placards are a separate paper-size-aware PDF, not tiny labels cut from
 * a raster collage. Text remains PDF text and each QR is generated locally.
 */
export async function exportExhibitKitPDF(recipe: MosaicRecipe, layout: Layout): Promise<void> {
  const manifest = createExhibitManifest(recipe);
  if (layout.pageWidth < 6 || layout.pageHeight < 7.5) {
    throw new Error('This paper size is too small for legible exhibition placards.');
  }
  const orientation = layout.pageWidth > layout.pageHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation, unit: 'in',
    format: [layout.pageWidth, layout.pageHeight],
    compress: true, precision: 5,
  });
  pdf.setProperties({
    title: manifest.exhibition + ' / RastaPhi Exhibit Kit',
    subject: 'Exhibition entrance card and removable artwork placards',
    creator: 'RastaPhi',
  });
  addTitleCard(pdf, manifest.exhibition, manifest.subtitle,
    manifest.items.length, layout.pageWidth, layout.pageHeight);

  const topMargin = .57;
  const bottomMargin = .57;
  const gap = .24;
  const h = (layout.pageHeight - topMargin - bottomMargin - gap) / PLACARDS_PER_PAGE;
  if (h < 2.8) throw new Error('The selected paper is too short for QR placards.');
  for (let page = 0; page < placardPages(manifest.items.length); page++) {
    pdf.addPage([layout.pageWidth, layout.pageHeight], orientation);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, layout.pageWidth, layout.pageHeight, 'F');
    for (let slot = 0; slot < PLACARDS_PER_PAGE; slot++) {
      const index = page * PLACARDS_PER_PAGE + slot;
      const item = manifest.items[index];
      if (!item) break;
      const top = topMargin + slot * (h + gap);
      await addPlacard(pdf, item, top, layout.pageWidth, h, recipe.gallery?.showQr ?? false);
    }
    pdf.setTextColor(95, 101, 108);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Placard sheet ' + (page + 1) + ' / ' + placardPages(manifest.items.length),
      layout.pageWidth - .65, layout.pageHeight - .23, { align: 'right' });
  }
  pdf.save('rastaphi-exhibit-kit.pdf');
}
