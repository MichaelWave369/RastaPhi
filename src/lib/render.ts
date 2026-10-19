import type { Effect, Fit, Layout, Tile } from './layout';

export interface ArtOptions {
  effect: Effect;
  fit: Fit;
  ink: string;
  paperColor: string;
  dotSizeMm: number;
  posterWidth: number;
  posterHeight: number;
}

const colorChannels = (hex: string) => {
  const valid = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#151b28';
  return [1, 3, 5].map(i => parseInt(valid.slice(i, i + 2), 16));
};

export function drawFittedImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  iw: number,
  ih: number,
  width: number,
  height: number,
  fit: Fit,
  background: string,
) {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const scale = fit === 'cover'
    ? Math.max(width / iw, height / ih)
    : Math.min(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

export function createArtCanvas(
  image: HTMLImageElement,
  opts: ArtOptions,
  maxSide = 1400,
): HTMLCanvasElement {
  const maxInches = Math.max(opts.posterWidth, opts.posterHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(maxSide * opts.posterWidth / maxInches));
  canvas.height = Math.max(1, Math.round(maxSide * opts.posterHeight / maxInches));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas rendering is not supported in this browser.');
  drawFittedImage(ctx, image, image.naturalWidth, image.naturalHeight,
    canvas.width, canvas.height, opts.fit, opts.paperColor);

  if (opts.effect === 'mono') {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722);
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
    ctx.putImageData(pixels, 0, 0);
  }

  if (opts.effect === 'duotone') {
    const dark = colorChannels(opts.ink);
    const light = colorChannels(opts.paperColor);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const t = (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255;
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(dark[c] * (1 - t) + light[c] * t);
    }
    ctx.putImageData(pixels, 0, 0);
  }

  if (opts.effect === 'halftone') {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.fillStyle = opts.paperColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = opts.ink;
    // Pitch is in physical millimeters, so dot placement stays aligned across ALL sheets.
    const pitch = Math.max(2, opts.dotSizeMm / 25.4 * (canvas.width / opts.posterWidth));
    const stride = canvas.width * 4;
    for (let y = pitch / 2; y < canvas.height; y += pitch) {
      for (let x = pitch / 2; x < canvas.width; x += pitch) {
        const index = Math.min(canvas.height - 1, Math.floor(y)) * stride
          + Math.min(canvas.width - 1, Math.floor(x)) * 4;
        const brightness = (pixels[index] * .2126 + pixels[index + 1] * .7152
          + pixels[index + 2] * .0722) / 255;
        const radius = Math.sqrt(Math.max(0, 1 - brightness)) * pitch * .52;
        if (radius < .25) continue;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return canvas;
}

export function renderTileCanvas(
  image: HTMLImageElement,
  processed: HTMLCanvasElement | null,
  layout: Layout,
  tile: Tile,
  opts: ArtOptions,
  dpi: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(layout.usableWidth * dpi));
  canvas.height = Math.max(1, Math.round(layout.usableHeight * dpi));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to make a printable tile canvas.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, tile.width * dpi, tile.height * dpi);
  ctx.clip();
  ctx.translate(-tile.x * dpi, -tile.y * dpi);
  const fullW = opts.posterWidth * dpi;
  const fullH = opts.posterHeight * dpi;
  if (processed) {
    ctx.drawImage(processed, 0, 0, fullW, fullH);
  } else {
    if (opts.effect === 'mono') ctx.filter = 'grayscale(100%)';
    drawFittedImage(ctx, image, image.naturalWidth, image.naturalHeight,
      fullW, fullH, opts.fit, opts.paperColor);
    ctx.filter = 'none';
  }
  ctx.restore();
  return canvas;
}

export function makeDemoArt(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1450;
  const c = canvas.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 1000, 1450);
  g.addColorStop(0, '#ffcb83');
  g.addColorStop(.55, '#f5a77e');
  g.addColorStop(1, '#e46b8b');
  c.fillStyle = g;
  c.fillRect(0, 0, 1000, 1450);
  c.fillStyle = '#20243b';
  c.beginPath();
  c.arc(580, 660, 410, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    c.strokeStyle = i % 2 ? '#ffd28c' : '#6d7da9';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(580 + Math.cos(angle) * 160, 660 + Math.sin(angle) * 160);
    c.lineTo(580 + Math.cos(angle) * 375, 660 + Math.sin(angle) * 375);
    c.stroke();
  }
  c.fillStyle = '#f6f2e6';
  c.beginPath();
  c.arc(580, 660, 170, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f57c77';
  c.beginPath();
  c.arc(580, 660, 122, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(72, 122);
  c.rotate(-.08);
  c.font = '900 178px Arial, sans-serif';
  c.fillStyle = '#fef9e9';
  c.shadowColor = '#171e33';
  c.shadowOffsetX = 10;
  c.shadowOffsetY = 12;
  c.fillText('MAKE', 0, 0);
  c.fillText('IT', 0, 180);
  c.fillText('BIG.', 0, 360);
  c.restore();
  c.shadowColor = 'transparent';
  c.fillStyle = '#171e33';
  c.fillRect(0, 1150, 1000, 300);
  c.fillStyle = '#ffe8b5';
  c.font = 'bold 48px Arial, sans-serif';
  c.fillText('RASTAPHI  /  WALL ART LAB', 70, 1247);
  c.font = '30px Arial, sans-serif';
  c.fillText('PRINT SMALL. BUILD HUGE.', 70, 1320);
  c.fillStyle = '#f7b5a7';
  c.fillRect(70, 1358, 860, 5);
  return canvas.toDataURL('image/png');
}
