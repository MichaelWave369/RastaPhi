# RastaPhi Creative Bridge v1

Creative Bridge is a **local-first file handoff**, not a remote connection or a live API.

RastaPhi v0.9 can **export** its current artwork as `*.rastaphi-bridge.json` and **import** a compatible JSON file from any other app. This offers a simple contract for Domistika, Silicon Louvre, PixelForge, or any browser-based art tool to implement later. **Those apps do not automatically gain export buttons until they add an adapter.**

## Minimal interoperable payload

```json
{
  "format": "rastaphi-creative-bridge",
  "version": 1,
  "sourceApp": "Your Creative App",
  "sourceUrl": "https://example.org",
  "creator": "Optional artist credit",
  "title": "Gallery print",
  "createdAt": "2026-10-19T20:00:00.000Z",
  "asset": {
    "kind": "svg",
    "name": "design.svg",
    "markup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><circle cx=\"100\" cy=\"100\" r=\"75\" fill=\"#8cbdc2\"/></svg>"
  }
}
```

- `format` and `version` must match exactly.
- `sourceApp` and `title` are required. `sourceUrl` and `creator` are optional strings; if present, `sourceUrl` must use HTTPS.
- `createdAt` is a valid ISO timestamp.
- `asset` must be **self-contained**: no remote media references, scripts or embedded HTML.
- `settings` is optional. Without it, RastaPhi uses the currently selected poster/paper/print settings. With it, provide the complete [Project Vault v2](../src/lib/project.ts) settings object.
- File size limit is **44 MB**. A valid file cannot bypass RastaPhi's existing dimension, tile-count or asset restrictions.

## Supported assets

**Raster image:**

```json
{ "kind": "raster", "name": "art.png", "dataUrl": "data:image/png;base64,..." }
```

Use a complete base64-encoded PNG, JPEG or WebP data URL, not the literal ellipsis. The PNG/JPEG/WebP image is decoded locally. Do not supply an HTTP image URL.

**SVG vector art:**

```json
{ "kind": "svg", "name": "drawing.svg", "markup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"#224466\"/></svg>" }
```

SVG is **re-sanitized** on import with the R3 SVG allowlist. Unsupported SVG features are removed. For supported geometry, the Original effect preserves vector elements in tiled PDFs; effects such as DotLab rasterize them.

**Editable gallery / mosaic:**

```json
{
  "kind": "mosaic",
  "name": "Exhibition from another app",
  "photos": [
    {
      "name": "piece-one.jpg",
      "dataUrl": "data:image/jpeg;base64,...",
      "title": "Piece One",
      "artist": "Creator Name",
      "url": "https://example.org/piece-one"
    }
  ],
  "columns": 1,
  "gapPercent": 3,
  "background": "#ffffff",
  "fit": "cover",
  "gallery": {
    "enabled": true,
    "title": "My Exhibition",
    "subtitle": "An open source collection",
    "showQr": true
  }
}
```

Each `dataUrl` must contain real embedded image bytes. MosaicLab supports up to 12 photos and keeps metadata editable in Project Vault after import. No artwork URLs are followed or fetched.

## Example: export a canvas from another local-first tool

This runs **inside the exporting tool**, using its own already-rendered canvas. It is an illustrative adapter, not code already installed in the other repos:

```js
function exportToRastaPhi(canvas, name = 'New artwork') {
  const handoff = {
    format: 'rastaphi-creative-bridge',
    version: 1,
    sourceApp: 'Your Creative App',
    sourceUrl: '',
    creator: '',
    title: name,
    createdAt: new Date().toISOString(),
    asset: {
      kind: 'raster',
      name: 'artwork.png',
      dataUrl: canvas.toDataURL('image/png'),
    },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(handoff)], {
    type: 'application/json',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'creative-handoff.rastaphi-bridge.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
```

A canvas with cross-origin images may be tainted and refuse `toDataURL`. The source app should ask the user to supply locally owned artwork rather than silently fetch from elsewhere.

## Privacy and verification

- Import is an **explicit user action**. Confirmation is requested before replacing unsaved RastaPhi work.
- Creative Bridge does not use network fetching, cloud storage, message listeners, or arbitrary script execution.
- Bridge files can contain **the entire artwork**, including potentially sensitive imagery or creator/source metadata. Review before sharing.
- RastaPhi Project Vault format (`*.rastaphi.json`) is separate and remains fully supported.
- Test imported artwork in the preview, export a print-proof PDF, check dimensions at **Actual Size / 100%**, and use a real printer/phone to validate QR codes.

The sample file [examples/creative-bridge-v1.svg.json](../examples/creative-bridge-v1.svg.json) is a standalone supported SVG handoff you can import to test the workflow.
