# RastaPhi

**Think BIG. Print small. Build HUGE.**

RastaPhi is an original, MIT-licensed, local-first wall-art and large-format poster studio. Turn one image into a correctly sized, multi-sheet PDF that you can print with an ordinary home printer.

**Live site after GitHub Pages is enabled:** https://michaelwave369.github.io/RastaPhi/

## R8 / v0.9 Creative Bridge

RastaPhi now supports an explicit **local Creative Bridge handoff** for sharing artwork and exhibition designs between compatible apps.

- **Export Bridge:** save the current artwork (raster, sanitized SVG, or editable MosaicLab/Gallery Composer source) and active print settings as a self-contained `.rastaphi-bridge.json` file. No server upload occurs.
- **Import Bridge:** load a compatible handoff produced by RastaPhi or any other app that implements the documented format. Check source information and confirm before replacing your unsaved artwork.
- **Safe import:** images must be embedded data URLs, SVG is re-sanitized, and remote links are metadata only. No automatic fetching, script execution, or direct browser messaging.
- **Print settings:** handoffs may include complete RastaPhi print settings. External apps can omit these so the existing local printer settings remain in effect.
- **Project Vault preserved:** normal `.rastaphi.json` saves still work. A Creative Bridge handoff can be imported and then saved as a regular Project Vault project.
- **Starter sample:** import `examples/creative-bridge-v1.svg.json` to verify vector shape handling before wiring a third-party app.

**This is the receiving and exporting format, not a live direct integration with another repo yet.** Domistika, Silicon Louvre, and PixelForge can adopt the protocol in their own future PRs.

Full JSON contract, supported assets, and an example source-app exporter: [Creative Bridge v1](docs/CREATIVE_BRIDGE_V1.md).

## R7 / v0.8 Exhibit Kit

Take a Gallery Composer exhibition off the screen with a matching set of physical display materials.

- **Download Exhibit Kit PDF** from an enabled Gallery Composer. The first page is an exhibition entrance/title card. Remaining pages contain **two removable artwork placards per sheet** (cut along the frames), sized for the selected printer paper.
- **Titles and credits remain PDF text.** Unlike the mosaic artwork, these separate placards are not baked into the same raster image.
- **Offline QR codes:** when gallery QR links are enabled, codes are generated at about 1.55 inches wide using the local `qrcode` library. Each PDF QR image also has a clickable link annotation. QR codes are not added if the photo lacks an HTTPS link.
- **Photo-free manifest export:** download a versioned `*-manifest.json` with exhibition title, subtitle, piece order, source file names, titles, credits, and HTTPS links, but **no images or embedded image pixels**.
- **No new project format:** Exhibit Kit reads directly from Gallery Composer metadata already preserved in the Project Vault v2 format. Existing v1/v2 projects continue to load.
- **Independent exports:** generating placards does not change the current poster design or its print-sheet PDF. You can print both the exhibition wall and its signs.

### Exhibit Kit print checklist

1. Add photos to MosaicLab, enable Gallery Composer, and enter the artwork title, artist and optional HTTPS destination for each piece.
2. Download the **Exhibit Kit PDF**. If needed, also download the photo-free exhibit manifest.
3. Print the PDF at **Actual Size / 100%**. Run a calibration sheet before using expensive paper.
4. Trim and mount placards, then physically test every printed QR code with a phone before your show opens.
5. Keep a portable Project Vault file to preserve editable photos and captions. Manifest JSON is metadata only, **not** a substitute for the project backup.

**Privacy:** The manifest includes source filenames, credits and any supplied URLs, which may themselves contain personal information; it simply omits the image data. No remote URLs are fetched to create the PDF or the manifest. Images are still processed locally.

**Limitations:** PDF codes are raster PNGs at sufficiently high generation resolution, not vector QR modules; PDF viewer/printer scaling still affects scanability. There is no automated physical print verification.

## R6 / v0.7 Gallery Composer

Turn editable MosaicLab collages into coordinated exhibition walls.

- **Exhibition header:** give your wall a title and subtitle, with a dedicated display area above the panel grid.
- **Artwork labels:** add a printed title and artist/credit for every panel. Labels stay attached to their photo when you reorder the collage.
- **Optional QR codes:** attach a complete HTTPS artwork link to each panel. QR images are generated inside your browser using the open-source `qrcode` library. RastaPhi does **not** visit or upload the link.
- **Scannability guard:** for small panels, QR images are omitted rather than printed at impractically small sizes. Increase finished poster size or reduce the number of columns/rows. **Print and physically scan every code before mounting an exhibition.**
- **Project Vault compatible:** Gallery Composer settings and photo labels are optional properties on the existing v2 MosaicLab project format. Older v1 and v2 projects without gallery metadata still open and render normally.
- **Printing:** all gallery content is currently composed into a rasterized poster image, then tiled by the existing PDF engine. Blueprint grid overlays remain vector. Labels and QR codes are not separate vector PDF layers yet.
- **Local-first:** photo pixels and URLs stay on your device unless you intentionally export/share a project file or a printed QR code. Portable projects include your image sources and entered links.

### Quick gallery workflow

1. Add your photos in **MosaicLab**.
2. Open **Gallery Composer**, enable the gallery layout, and enter the exhibition title/subtitle.
3. Add titles, artist credits, and optional HTTPS links to the artwork labels.
4. Check the live wall preview, adjust poster dimensions or grid columns for QR-code readability, then export the PDF.
5. Print at **Actual Size / 100%**, check calibration, scan the physical QR labels, and tape/mount the panels.

## R5 / v0.6 MosaicLab

- **Multi-photo poster studio:** add 1–12 local PNG, JPEG, or WebP photos to an editable collage using a configurable 1–6 column grid.
- **Collage editing:** reorder and remove source photos, choose crop/fill or contain for each tile, adjust tile gutters and background color. Live poster preview and ordinary multi-sheet PDF export update to reflect the composition.
- **Local optimization:** source photos are resized to at most 1700 pixels on the longer edge and converted to compressed JPEG locally before composing. Per-input size limit 10 MB. This conserves memory and keeps portable project files manageable, but may reduce source detail.
- **Project Vault v2:** saves every compressed input photo, photo order, and collage settings rather than only a flattened snapshot. Reopening a mosaic recreates the composition using the current poster dimensions.
- **Backwards compatibility:** existing v1 `.rastaphi.json` files and locally saved projects remain readable and are migrated in memory to the v2 project schema when reopened.
- **Flatten action:** converts an editable collage to a single raster poster; save a portable project file first if you want to retain individual photo editing.
- **Limitations:** a collage is rasterized before PDF tile export; SVG vector preservation continues to work for individual SVG artwork, but mosaics do not yet support per-photo SVG vectors. The measured Blueprint Lab reference grid is still drawn as PDF vectors. Physical printer calibration remains necessary.

All photos remain local to the browser; there are no network uploads. The optional Project Vault portable backup embeds the photos, so handle those files as private images if the source material is personal.

## R4 / v0.5 Project Vault

Save and reopen complete poster projects without an account or cloud storage.

- **Save locally:** Save a named project in browser IndexedDB. The local vault lists saved projects with Open, Download backup, and Delete actions.
- **Portable file export:** Download a self-contained `.rastaphi.json` with the original raster asset embedded as a base64 data URL, or sanitized SVG source as markup. File extension and JSON version are explicit so future releases can migrate deliberately.
- **Portable import:** Open saved project files from another computer. The importer validates dimensions, sheet limits, media data, effects, and grid options before restoring editor state. SVG artwork is re-sanitized before display or PDF conversion.
- **Full settings restoration:** Restore finished dimensions, aspect lock, sheet type/orientation, margins, overlap, treatment, colors, DotLab size, blueprint grid, print guide, grid visibility, sheet proof selection and view.
- **Safe replacement workflow:** Opening a project warns before replacing unsaved edits. Deleting a local project requires confirmation.
- **Local-first and manual:** No account, uploads, tracking, or automatic cloud sync. Browser storage can be cleared by the browser or user. Export/download portable project files regularly for durable backups.

**Privacy note:** A portable project backup includes the embedded image. Treat `.rastaphi.json` files like the original photo: share them only when you intend to share the source artwork. The v2 format supports PNG, JPEG, WebP, sanitized SVG, and editable local-photo collages. Old v1 projects remain readable. Project files are capped at approximately 44 MB and source SVGs at 2 MB; browser storage capacity varies. This is not an autosave system.

## R3 / v0.4 SVG Studio

- **Import original SVG files** in addition to PNG, JPEG, and WebP. Source SVG import is capped at **2 MB** and **3,500 supported drawing elements**.
- **Built-in restricted SVG importer:** reconstructs a fresh, local SVG with only safe vector geometry (paths, lines, rectangles, circles, ellipses, polylines, polygons, text, and groups). Scripts, HTML/foreignObject, embedded/external images, URL links, filters, animations, references, and unsupported components are discarded.
- **Preserve vector artwork in multipage PDFs** when the Original art treatment is selected. Each print sheet receives vector SVG geometry at the correct crop/fit and paper position. Grid overlays remain vector too.
- **Clear fallback behavior:** DotLab, grayscale, and duotone transformations rasterize the SVG. The studio indicates when true vector output is active.
- **Safe subset, not full SVG compatibility:** unsupported content may disappear, including SVG symbols/use, CSS classes and stylesheets, clipping masks, gradients, markers, embedded fonts, and images. Text may substitute PDF fonts. Inspect each sheet before printing. Imported SVGs are never sent to a server.

Vector conversion uses [svg2pdf.js](https://github.com/yWorks/svg2pdf.js), which itself only supports part of the SVG specification. The importer limits source complexity to reduce exposure to untrusted content, but untrusted file processing can never be guaranteed risk-free. For complex SVG assets, consider simplifying in a trusted vector editor before importing.

## R2 / v0.3 Blueprint Lab

- **Measured reference grids** over artwork: 1/4 inch, 1/2 inch, 1 inch, 1 cm, or 5 cm.
- **Global, seam-aligned grid:** grid placement uses the poster origin rather than resetting at page boundaries, so lines align even through overlap.
- **Vector grid inside PDF:** technical grid lines are drawn with PDF vector commands, while source artwork remains rasterized.
- **Grid colors** (cyan or slate), with optional printable global page-coordinate labels.
- **Blank grid worksheets:** choose *Start Blank Grid Sheet* without supplying an image, then set actual dimensions and print a reference template.
- **Live wall and sheet previews** include the same global grid layout. Export entire posters or single replacement sheets with identical grid positioning.

**Scale caution:** The reference grid measures *the final paper/poster*, NOT the size of objects in an imported schematic. A raster drawing's real-world scale is unknown unless you independently establish it and set matching print dimensions. This release does not vectorize raster artwork or certify engineering/architectural scale. Physical output must be calibrated on each printer at **Actual Size / 100%**.

## R1 / v0.2 print-proof tools

- **Dedicated printer calibration PDF**: measure a 1-inch square, a 50 mm square, and 5-inch ruler before committing an entire poster to ink.
- **Print Proof tab**: inspect a selected sheet before generating its PDF, with previous/next page controls.
- **Targeted sheet reprint**: export one numbered tile without exporting the entire multi-sheet poster.
- **Source resolution check**: see an estimated source pixels-per-inch value at the chosen physical size and an honest warning for potentially soft results. This is an estimate, not a guarantee of printer output; current PDF tiles are rasterized at approximately 135 DPI, and stylized effects can be softer.

## R0 / v0.1 features

- React + TypeScript + Vite; designed to publish as a static GitHub Pages website
- Drag/drop or browse to load JPEG, PNG, and WebP images (up to 30 MB), plus restricted SVG (up to 2 MB)
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

R2: measured vector PDF grid, global tile alignment, blank technical grid worksheets (v0.3). Future: native vector-document import, mosaic/stencil workflows, save/load local projects.

R3: safe, limited native SVG import and vector-preserving printable PDFs (v0.4).

R4: local Project Vault and portable backups (v0.5).

R5: MosaicLab editable photo grids with v1-to-v2 project migration (v0.6).

R6: Gallery Composer exhibition titles, artwork credits, and local QR labels (v0.7).

R7: Exhibit Kit entrance card, placard PDF, and photo-free catalog manifest (v0.8).

R8: Creative Bridge offline, portable artwork handoff v1 (v0.9). Next: implement first-party adapters in Domistika and Silicon Louvre, separately.

## License

MIT. See [LICENSE](LICENSE). Built to make physical creativity accessible without expensive equipment.
