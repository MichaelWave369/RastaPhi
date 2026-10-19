import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Download, FileImage, Grid2X2,
  ImagePlus, Layers3, Lock, Maximize2, Palette, Printer, Ruler,
  ScanLine, ShieldCheck, Sparkles, Unlock, WandSparkles,
} from 'lucide-react';
import {
  buildLayout, formatDimension, inchesToCm, type Effect, type Fit,
  type Orientation, type Paper,
} from './lib/layout';
import { createArtCanvas, makeDemoArt, renderTileCanvas, type ArtOptions } from './lib/render';
import { sourcePixelsPerInch, printQualityBand, qualityDescription } from './lib/quality';
import { exportCalibrationPDF } from './lib/calibration';
import { exportPosterPDF } from './lib/pdf';

const effectChoices: { value: Effect; label: string; helper: string }[] = [
  { value: 'original', label: 'Original', helper: 'Full color' },
  { value: 'mono', label: 'Mono', helper: 'Classic B&W' },
  { value: 'halftone', label: 'DotLab', helper: 'Print dots' },
  { value: 'duotone', label: 'Duotone', helper: 'Two-tone ink' },
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const fromField = (value: string, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        <div className="brand-ring" /><span>Φ</span>
      </div>
      <div className="brand-word">RASTA<span>PHI</span><sup>®</sup></div>
    </div>
  );
}

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState('RastaPhi demo artwork');
  const [posterWidth, setPosterWidth] = useState(24);
  const [posterHeight, setPosterHeight] = useState(36);
  const [ratioLocked, setRatioLocked] = useState(false);
  const [paper, setPaper] = useState<Paper>('letter');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margin, setMargin] = useState(0.4);
  const [overlap, setOverlap] = useState(0.2);
  const [fit, setFit] = useState<Fit>('cover');
  const [effect, setEffect] = useState<Effect>('original');
  const [dotSizeMm, setDotSizeMm] = useState(4);
  const [ink, setInk] = useState('#263044');
  const [paperColor, setPaperColor] = useState('#f8eed9');
  const [guide, setGuide] = useState(true);
  const [grid, setGrid] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState(1);
  const [view, setView] = useState<'wall' | 'map' | 'sheet'>('wall');
  const [isDragging, setIsDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const demo = new Image();
    demo.onload = () => setImage(demo);
    demo.src = makeDemoArt();
  }, []);

  function loadFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('Please choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setNotice('Choose an image smaller than 30 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => {
      URL.revokeObjectURL(url);
      setImage(next);
      setImageName(file.name);
      setNotice('');
      if (ratioLocked) setPosterHeight(Number((posterWidth * next.naturalHeight / next.naturalWidth).toFixed(1)));
    };
    next.onerror = () => {
      URL.revokeObjectURL(url);
      setNotice('This image could not be decoded. Try another PNG, JPEG, or WebP.');
    };
    next.src = url;
  }

  function updateWidth(n: number) {
    const width = clamp(n, 1, 120);
    setPosterWidth(width);
    if (ratioLocked && image) {
      setPosterHeight(Number((width * image.naturalHeight / image.naturalWidth).toFixed(1)));
    }
  }

  function updateHeight(n: number) {
    const height = clamp(n, 1, 120);
    setPosterHeight(height);
    if (ratioLocked && image) {
      setPosterWidth(Number((height * image.naturalWidth / image.naturalHeight).toFixed(1)));
    }
  }

  const layoutState = useMemo(() => {
    try {
      return { layout: buildLayout({ posterWidth, posterHeight, paper, orientation, margin, overlap }), error: '' };
    } catch (err) {
      return { layout: null, error: err instanceof Error ? err.message : 'Unable to calculate printable pages.' };
    }
  }, [posterWidth, posterHeight, paper, orientation, margin, overlap]);
  const layout = layoutState.layout;

  const artOptions: ArtOptions = useMemo(() => ({
    posterWidth, posterHeight, fit, effect, dotSizeMm, ink, paperColor,
  }), [posterWidth, posterHeight, fit, effect, dotSizeMm, ink, paperColor]);

  const previewUrl = useMemo(() => {
    if (!image) return '';
    try {
      return createArtCanvas(image, artOptions, 1150).toDataURL('image/png');
    } catch {
      return '';
    }
  }, [image, artOptions]);

  const currentSheet = Math.min(Math.max(1, selectedSheet), layout?.total ?? 1);
  const sourcePpi = image ? Math.round(sourcePixelsPerInch(
    image.naturalWidth, image.naturalHeight, posterWidth, posterHeight, fit,
  )) : 0;
  const qualityBand = printQualityBand(sourcePpi);

  const sheetPreviewUrl = useMemo(() => {
    if (!image || !layout || view !== 'sheet') return '';
    try {
      const tile = layout.tiles[currentSheet - 1];
      if (!tile) return '';
      const processed = effect === 'duotone' || effect === 'halftone'
        ? createArtCanvas(image, artOptions, 1150) : null;
      return renderTileCanvas(image, processed, layout, tile, artOptions, 65).toDataURL('image/jpeg', .88);
    } catch { return ''; }
  }, [image, layout, currentSheet, view, artOptions, effect]);

  function doCalibration() {
    if (!layout) return;
    try {
      exportCalibrationPDF(layout);
      setNotice('Calibration sheet saved. Print it at Actual Size / 100%, then measure both squares and the ruler.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to export printer test sheet.');
    }
  }

  async function doExport(mode: 'all' | 'sheet' = 'all') {
    if (!image || !layout || exporting) return;
    if (mode === 'all' && layout.total > 48 && !window.confirm(
      'This poster uses ' + layout.total + ' sheets. The PDF may be large. Continue?'
    )) return;
    setExporting(true);
    setProgress(0);
    setNotice('');
    try {
      await exportPosterPDF({
        image, layout, options: artOptions, includeGuide: mode === 'all' && guide,
        selectedIndex: mode === 'sheet' ? currentSheet : undefined,
        onProgress: (done, total) => setProgress(Math.round(done / total * 100)),
      });
      setNotice(mode === 'sheet'
        ? 'Sheet ' + currentSheet + ' has been exported for reprinting at 100% / Actual Size.'
        : 'Your print-ready PDF has been generated. Print at 100% / Actual Size!');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not export this poster. Try a smaller size.');
    } finally {
      setExporting(false);
    }
  }

  const dimString = formatDimension(posterWidth) + ' × ' + formatDimension(posterHeight);
  const visibleTiles = layout && layout.total <= 80 ? layout.tiles : [];
  const area = posterWidth * posterHeight / 144;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="top-nav" aria-label="Main navigation">
          <span className="nav-active">POSTER STUDIO</span>
          <a href="https://github.com/MichaelWave369/RastaPhi" target="_blank" rel="noopener noreferrer">GITHUB <ArrowRight size={13} /></a>
        </nav>
        <div className="top-private"><ShieldCheck size={15} /><span>100% PRIVATE. 100% YOURS.</span></div>
      </header>

      <main>
        <section className="hero" aria-label="Introducing RastaPhi">
          <div className="eyebrow"><span className="eyebrow-line" /> THE WALL IS YOUR CANVAS <span className="hero-index">001 / ∞</span></div>
          <h1>Think <em>BIG.</em><br />Print small.<br /><span>Build HUGE.</span></h1>
          <div className="hero-bottom">
            <p>One image. Any wall. Your regular printer.<br />Meet the ridiculously powerful poster studio built for creators who refuse to think in paper sizes.</p>
            <div className="hero-squiggle" aria-hidden="true"><span>↗</span></div>
          </div>
        </section>

        <div className="workspace-heading">
          <div className="section-id"><span>01</span><div><strong>THE STUDIO</strong><small>Make something larger than life.</small></div></div>
          <span className="version-pill"><span /> RASTAPHI R1 · V0.2</span>
        </div>

        <div className="workspace">
          <aside className="settings-col" aria-label="Poster settings">
            <section className="setting-card uploader-card">
              <div className="section-title"><span>01 / SOURCE</span><ImagePlus size={18} /></div>
              <div
                className={'drop-area ' + (isDragging ? 'dragging' : '')}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDrop={e => { e.preventDefault(); setIsDragging(false); loadFile(e.dataTransfer.files[0]); }}
              >
                <input
                  ref={fileRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Choose artwork image"
                  onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }}
                />
                <div className="upload-symbol"><FileImage size={24} /></div>
                <strong>Drop your masterpiece here.</strong>
                <p>PNG, JPG or WebP. Maximum 30 MB.</p>
                <button type="button" className="outline-button" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={15} /> CHOOSE IMAGE
                </button>
              </div>
              <div className="file-indicator"><div className="file-dot" /><span title={imageName}>{imageName}</span><Check size={15} /></div>
            </section>

            <section className="setting-card">
              <div className="section-title"><span>02 / THE SIZE OF YOUR DREAMS</span><Ruler size={18} /></div>
              <div className="dimensions-head">
                <strong>Poster dimensions</strong>
                <button
                  type="button"
                  className={'ratio-button ' + (ratioLocked ? 'selected' : '')}
                  onClick={() => {
                    if (!ratioLocked && image) {
                      setPosterHeight(Number((posterWidth * image.naturalHeight / image.naturalWidth).toFixed(1)));
                    }
                    setRatioLocked(!ratioLocked);
                  }}
                >{ratioLocked ? <Lock size={13} /> : <Unlock size={13} />} {ratioLocked ? 'LOCKED' : 'FREE'}</button>
              </div>
              <div className="dimension-inputs">
                <label>WIDTH <div className="input-with-unit"><input type="number" min="1" max="120" step=".5" value={posterWidth} onChange={e => updateWidth(fromField(e.target.value, posterWidth))} /><span>IN</span></div></label>
                <div className="dimension-cross">×</div>
                <label>HEIGHT <div className="input-with-unit"><input type="number" min="1" max="120" step=".5" value={posterHeight} onChange={e => updateHeight(fromField(e.target.value, posterHeight))} /><span>IN</span></div></label>
              </div>
              <p className="helper-text">{formatDimension(inchesToCm(posterWidth))} × {formatDimension(inchesToCm(posterHeight))} cm · {formatDimension(area)} sq ft</p>
              <div className="rule" />
              <div className="dimensions-head"><strong>Paper size</strong><small>YOUR PRINTER</small></div>
              <div className="select-row">
                <label className="select-wrap">
                  <span className="visually-hidden">Paper size</span>
                  <select value={paper} onChange={e => setPaper(e.target.value as Paper)}>
                    <option value="letter">US Letter · 8.5 × 11</option>
                    <option value="a4">A4 · 210 × 297 mm</option>
                    <option value="a3">A3 · 297 × 420 mm</option>
                  </select><ChevronDown size={16} />
                </label>
                <label className="select-wrap orientation-select">
                  <span className="visually-hidden">Paper orientation</span>
                  <select value={orientation} onChange={e => setOrientation(e.target.value as Orientation)}>
                    <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                  </select><ChevronDown size={16} />
                </label>
              </div>
              <div className="slider-row"><label htmlFor="margin">Print margins</label><strong>{margin.toFixed(2)} IN</strong></div>
              <input id="margin" type="range" min=".25" max=".75" step=".05" value={margin} onChange={e => setMargin(Number(e.target.value))} />
              <div className="slider-row"><label htmlFor="overlap">Sheet overlap</label><strong>{overlap.toFixed(2)} IN</strong></div>
              <input id="overlap" type="range" min="0" max=".5" step=".05" value={overlap} onChange={e => setOverlap(Number(e.target.value))} />
              <p className="helper-text">Overlap helps you line up sheets when taping.</p>
            </section>

            <section className="setting-card">
              <div className="section-title"><span>03 / MAKE IT YOURS</span><WandSparkles size={18} /></div>
              <strong className="setting-label">Art treatment</strong>
              <div className="effect-grid">
                {effectChoices.map(item => (
                  <button type="button" key={item.value}
                    className={'effect-choice ' + (effect === item.value ? 'chosen' : '')}
                    onClick={() => setEffect(item.value)}>
                    <span className={'effect-icon ' + item.value} aria-hidden="true">{item.value === 'original' ? '◩' : item.value === 'mono' ? '◐' : item.value === 'halftone' ? '⦿' : '◉'}</span>
                    <span><strong>{item.label}</strong><small>{item.helper}</small></span>
                  </button>
                ))}
              </div>
              <div className="dimensions-head compact"><strong>Image fitting</strong></div>
              <div className="segment">
                <button type="button" className={fit === 'cover' ? 'active' : ''} onClick={() => setFit('cover')}>FILL / CROP</button>
                <button type="button" className={fit === 'contain' ? 'active' : ''} onClick={() => setFit('contain')}>FIT / NO CROP</button>
              </div>
              {(effect === 'halftone' || effect === 'duotone') && (
                <div className="palette-options">
                  {effect === 'halftone' && <>
                    <div className="slider-row"><label htmlFor="dotPitch">Dot pitch</label><strong>{dotSizeMm} MM</strong></div>
                    <input id="dotPitch" type="range" min="2" max="12" step="1" value={dotSizeMm} onChange={e => setDotSizeMm(Number(e.target.value))} />
                  </>}
                  <div className="color-pair">
                    <label>INK <input type="color" value={ink} onChange={e => setInk(e.target.value)} /></label>
                    <label>PAPER <input type="color" value={paperColor} onChange={e => setPaperColor(e.target.value)} /></label>
                  </div>
                </div>
              )}
            </section>
          </aside>

          <section className="preview-col" aria-label="Poster preview and export">
            <div className="preview-top">
              <div className="preview-heading"><span><ScanLine size={18} /> LIVE WALL PREVIEW</span><small>WHAT YOU SEE IS WHAT YOU BUILD.</small></div>
              <div className="preview-tabs">
                <button type="button" className={view === 'wall' ? 'active' : ''} onClick={() => setView('wall')}>WALL VIEW</button>
                <button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>SHEET MAP</button>
                <button type="button" className={view === 'sheet' ? 'active' : ''} onClick={() => setView('sheet')}>PRINT PROOF</button>
              </div>
            </div>
            <div className={'wall-stage ' + (view === 'map' ? 'map-mode' : '') + (view === 'sheet' ? ' proof-mode' : '')}>
              <div className="wall-grain" />
              <div className="wall-topline">{view === 'sheet' ? 'R / P — ONE PAGE AT A TIME' : 'R / P — YOUR WALL, REIMAGINED'}</div>
              {view === 'sheet' && layout ? (
                <div className="proof-wrap">
                  <div className="proof-page" style={{ aspectRatio: String(layout.pageWidth) + ' / ' + String(layout.pageHeight) }}>
                    {sheetPreviewUrl && <img src={sheetPreviewUrl} alt={'Print proof for sheet ' + currentSheet} style={{
                      left: (layout.pageWidth - layout.usableWidth) / (2 * layout.pageWidth) * 100 + '%',
                      top: (layout.pageHeight - layout.usableHeight) / (2 * layout.pageHeight) * 100 + '%',
                      width: layout.usableWidth / layout.pageWidth * 100 + '%',
                      height: layout.usableHeight / layout.pageHeight * 100 + '%',
                    }} />}
                    <span className="proof-label">R{(layout.tiles[currentSheet - 1]?.row ?? 0) + 1} C{(layout.tiles[currentSheet - 1]?.col ?? 0) + 1} · {currentSheet}/{layout.total}</span>
                  </div>
                  <div className="proof-controls">
                    <button type="button" onClick={() => setSelectedSheet(Math.max(1, currentSheet - 1))} disabled={currentSheet === 1} aria-label="Previous sheet"><ArrowLeft size={18} /></button>
                    <span>SHEET <strong>{currentSheet}</strong> OF {layout.total}</span>
                    <button type="button" onClick={() => setSelectedSheet(Math.min(layout.total, currentSheet + 1))} disabled={currentSheet === layout.total} aria-label="Next sheet"><ArrowRight size={18} /></button>
                  </div>
                  <small>Approximate proof. Exported PDFs preserve physical dimensions.</small>
                </div>
              ) : <div className="poster-outer">
                <div className="poster-board" style={{ aspectRatio: String(posterWidth) + ' / ' + String(posterHeight) }}>
                  {previewUrl ? <img className="art-preview" src={previewUrl} alt="Preview of your poster artwork" /> : <div className="preview-loading">PREPARING THE CANVAS...</div>}
                  {layout && (grid || view === 'map') && <div className="tile-overlay" aria-label={layout.total + ' sheet print grid'}>
                    {Array.from({ length: layout.columns - 1 }, (_, i) =>
                      <span key={'c' + i} className="grid-vertical" style={{ left: (i + 1) * layout.stepX / posterWidth * 100 + '%' }} />
                    )}
                    {Array.from({ length: layout.rows - 1 }, (_, i) =>
                      <span key={'r' + i} className="grid-horizontal" style={{ top: (i + 1) * layout.stepY / posterHeight * 100 + '%' }} />
                    )}
                    {visibleTiles.map(tile =>
                      <span key={tile.index} className="tile-number" style={{
                        left: (tile.x + Math.min(tile.width / 2, layout.stepX / 2)) / posterWidth * 100 + '%',
                        top: (tile.y + Math.min(tile.height / 2, layout.stepY / 2)) / posterHeight * 100 + '%',
                      }}>{tile.index}</span>
                    )}
                  </div>}
                  <span className="tape tape-left" /><span className="tape tape-right" />
                </div>
              </div>}
              <div className="wall-bottomline"><span>{view === 'sheet' ? '←  ONE PRINTABLE SHEET  →' : '←  REAL-WORLD SCALE PREVIEW  →'}</span><strong>{view === 'sheet' ? layout?.pageWidth.toFixed(1) + ' × ' + layout?.pageHeight.toFixed(1) : dimString} IN</strong></div>
            </div>

            <div className="grid-toggle-row">
              <label className="toggle" htmlFor="grid-on"><input id="grid-on" type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /><span className="toggle-track" /> SHOW PRINT GRID</label>
              <span>DRAG YOUR OWN ARTWORK INTO THE STUDIO</span>
            </div>

            <div className="spec-cards">
              <div className="spec"><Grid2X2 size={19} /><span>PRINT SHEETS</span><strong>{layout?.total ?? '—'}</strong><small>{layout ? layout.columns + ' columns × ' + layout.rows + ' rows' : 'Invalid layout'}</small></div>
              <div className="spec"><Maximize2 size={19} /><span>FINISHED SIZE</span><strong>{dimString}<sub> IN</sub></strong><small>{formatDimension(inchesToCm(posterWidth))} × {formatDimension(inchesToCm(posterHeight))} cm</small></div>
              <div className="spec"><Layers3 size={19} /><span>WALL COVERAGE</span><strong>{formatDimension(area)}<sub> FT²</sub></strong><small>Made from everyday paper</small></div>
            </div>

            <div className={'print-quality band-' + qualityBand} aria-live="polite">
              <div><strong>ARTWORK RESOLUTION</strong><span>{sourcePpi ? sourcePpi + ' SOURCE PPI' : 'NO SOURCE'}</span></div>
              <p>{qualityDescription(sourcePpi)} The current PDF output samples tiles at approximately 135 PPI. Styled effects can be lower.</p>
            </div>

            <div className="export-panel">
              <div className="export-info">
                <div className="export-icon"><Printer size={24} /></div>
                <div><strong>Ready to make it real?</strong><p>Every page in the right place. No paid tools, no uploads, no nonsense.</p></div>
              </div>
              <div className="print-tools">
                <button type="button" className="proof-action" onClick={doCalibration} disabled={!layout || exporting}><Ruler size={17} /> DOWNLOAD 1-PAGE PRINT CHECK</button>
                <div className="reprint-row">
                  <label htmlFor="reprintSheet">REPRINT SHEET</label>
                  <input id="reprintSheet" aria-label="Sheet to reprint" type="number" min={1} max={layout?.total ?? 1} value={currentSheet} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 1) setSelectedSheet(Math.min(layout?.total ?? 1, Math.floor(n))); }} />
                  <button type="button" className="proof-action reprint-action" onClick={() => doExport('sheet')} disabled={!image || !layout || exporting}>EXPORT THIS SHEET</button>
                </div>
              </div>
              <label className="guide-toggle"><input type="checkbox" checked={guide} onChange={e => setGuide(e.target.checked)} /><span>Include assembly guide & 1-inch calibration square</span></label>
              {layoutState.error && <p className="error-message" role="alert">{layoutState.error}</p>}
              {notice && <p className="status-message" role="status">{notice}</p>}
              <button type="button" className="export-button" disabled={!image || !layout || exporting} onClick={() => doExport('all')}>
                {exporting ? <><span className="small-spinner" /> CREATING PDF... {progress}%</> :
                  <><Download size={20} /> EXPORT PRINT-READY PDF <ArrowRight size={19} /></>}
              </button>
              <p className="export-disclaimer">IMPORTANT: Print at <strong>ACTUAL SIZE / 100%</strong>, never “Fit to Page.” Check calibration before assembling.</p>
            </div>
          </section>
        </div>

        <section className="feature-strip">
          <div><ShieldCheck size={24} /><strong>PRIVATE BY DESIGN</strong><p>Your images never leave your browser.</p></div>
          <div><Palette size={24} /><strong>ART HAS NO LIMITS</strong><p>Classic posters, dots, duotone, and more.</p></div>
          <div><Sparkles size={24} /><strong>BUILT FOR EVERYONE</strong><p>Free, open source, and made to share.</p></div>
        </section>

        <footer><Brand /><p>SMALL SHEETS. INFINITE WALLS.</p><a href="https://github.com/MichaelWave369/RastaPhi" target="_blank" rel="noopener noreferrer">OPEN SOURCE ON GITHUB <ArrowRight size={14} /></a></footer>
      </main>
    </div>
  );
}

export default App;
