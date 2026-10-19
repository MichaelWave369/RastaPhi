import { jsPDF } from 'jspdf';
import type { Layout } from './layout';

/**
 * Generate an INDEPENDENT calibration sheet before using a lot of ink.
 * The only way to verify a printer's actual scaling is to measure a physical print.
 */
export function exportCalibrationPDF(layout: Layout): void {
  const orientation = layout.pageWidth > layout.pageHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'in',
    format: [layout.pageWidth, layout.pageHeight],
    compress: true,
    precision: 5,
  });
  const x = .78;
  pdf.setFillColor(21, 29, 37);
  pdf.rect(0, 0, layout.pageWidth, 1.35, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(248, 237, 213);
  pdf.setFontSize(22);
  pdf.text('RASTAPHI / PRINT CHECK', x, .66);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('One sheet now. Fewer surprises on the wall.', x, .96);
  pdf.setTextColor(33, 40, 48);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Before you print the whole poster:', x, 1.8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Select ACTUAL SIZE / 100% in your PDF printer dialog.', x, 2.04);
  pdf.text('Do not select Fit to page, Scale to fit, or Shrink to printable area.', x, 2.22);

  pdf.setDrawColor(18, 25, 33);
  pdf.setLineWidth(.014);
  const squareY = 2.65;
  pdf.rect(x, squareY, 1, 1);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('1 inch x 1 inch', x, squareY + 1.24);

  const mmIn = 50 / 25.4;
  const mmX = x + 2.7;
  pdf.rect(mmX, squareY, mmIn, mmIn);
  pdf.text('50 mm x 50 mm', mmX, squareY + mmIn + .24);

  const rulerY = 5.75;
  pdf.setFontSize(11);
  pdf.text('5-inch calibration ruler', x, rulerY - .29);
  pdf.setLineWidth(.02);
  pdf.line(x, rulerY, x + 5, rulerY);
  for (let step = 0; step <= 20; step++) {
    const tx = x + step / 4;
    const length = step % 4 === 0 ? .24 : .12;
    pdf.line(tx, rulerY - length / 2, tx, rulerY + length / 2);
    if (step % 4 === 0) {
      pdf.setFontSize(8);
      pdf.text(String(step / 4), tx, rulerY + .35, { align: 'center' });
    }
  }

  pdf.setDrawColor(95, 108, 120);
  pdf.setLineWidth(.01);
  pdf.line(x, 6.6, layout.pageWidth - x, 6.6);
  pdf.setFontSize(9);
  pdf.setTextColor(65, 77, 85);
  pdf.text('Measure both squares and the full ruler using a real ruler.', x, 6.88);
  pdf.text('If measurements differ, correct the printer scale before printing your poster.', x, 7.1);
  pdf.setFontSize(8);
  pdf.text('Paper: ' + layout.pageWidth.toFixed(2) + ' x ' + layout.pageHeight.toFixed(2) + ' inches', x, layout.pageHeight - .47);
  pdf.text('Generated privately in your browser', x, layout.pageHeight - .26);
  pdf.save('rastaphi-print-check.pdf');
}
