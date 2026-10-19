# RastaPhi

**Think BIG. Print small. Build HUGE.**

RastaPhi is an original, MIT-licensed, local-first wall-art and large-format poster studio. Turn one image into a correctly sized, multi-sheet PDF that you can print with an ordinary home printer.

**Live site after GitHub Pages is enabled:** https://michaelwave369.github.io/RastaPhi/

## R1 / v0.2 print-proof tools

- **Dedicated printer calibration PDF**: measure a 1-inch square, a 50 mm square, and 5-inch ruler before committing an entire poster to ink.
- **Print Proof tab**: inspect a selected sheet before generating its PDF, with previous/next page controls.
- **Targeted sheet reprint**: export one numbered tile without exporting the entire multi-sheet poster.
- **Source resolution check**: see an estimated source pixels-per-inch value at the chosen physical size and an honest warning for potentially soft results. This is an estimate, not a guarantee of printer output; current PDF tiles are rasterized at approximately 135 DPI, and stylized effects can be softer.

## R0 / v0.1 features

- React + TypeScript + Vite; designed to publish as a static GitHub Pages website
- Drag/drop or browse to load JPEG, PNG, and WebP images (up to 30 MB)
- Real-world poster dimensions in inches with centimeter equivalents, optionally lock to image ratio
- US Letter, A4, A3, portrait/landscape, adjustable page margins and overlap
- Original color, monochrome, duotone, and real-world-size halftone dots
- Live virtual wall preview with printable-sheet grid, sheet numbers, and estimated finished size
- Browser-generated, multipage PDF with corner marks and row/column labels
- Optional front-page assembly map and one-inch calibration square
- No server, login, image upload, or external image service

## Start locally

Requires Node.js 22+ and npm:

```bash
npm install
npm run dev
```

Then visit the local URL printed by Vite.

## Quality checks

```bash
npm run test
npm run build
```

The tests focus on poster layout geometry, printable area, sheet overlap, page order, and invalid dimensions.

## Printing accurately

1. Load artwork and set finished wall dimensions, paper size, margins, and overlap.
2. Export the PDF. Large posters can take more time and memory in your browser.
3. In your PDF print dialog choose **Actual size / 100%**. Disable **Fit to page** and **Shrink oversized pages**.
4. Print the assembly guide first. Measure its calibration square. It should be exactly **1 inch × 1 inch**.
5. Print the other pages, trim the necessary edges, line up overlapping content, and tape or mount tiles left-to-right, top-to-bottom. If a sheet jams, select its number in **Reprint Sheet** to export only that numbered tile.

Printer borders vary. A margin of 0.4 inches is a sensible default for many home printers, but some models require more. RastaPhi generates approximate 135-DPI output tiles; source quality and actual printer capabilities affect the final appearance.

## Publish using GitHub Pages

The included GitHub Actions workflow verifies the site on pull requests and deploys on push to `main`. After merging the first PR, go to **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source if it is not already selected. The production website will be at the URL above once Pages has successfully deployed.

The Vite base is set to `/RastaPhi/`, which prevents asset path 404 errors on GitHub Pages.

## Roadmap

R1: print-check sheet, one-sheet proof and reprint, source resolution estimates (v0.2). Future: alignment refinements, efficient giant-poster exports, more print modes.

R2: Blueprint mode, vector documents, mosaic and stencil workflows, save/load local projects.

R3: physical exhibit workflows with Domistika, Silicon Louvre, PixelForge, and other local-first creative projects.

## License

MIT. See [LICENSE](LICENSE). Built to make physical creativity accessible without expensive equipment.
