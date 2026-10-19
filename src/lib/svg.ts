import type { Fit } from './layout';

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const SVG_SIZE_LIMIT = 2 * 1024 * 1024;
const MAX_ELEMENTS = 3500;
const MAX_DEPTH = 36;
const MAX_TEXT = 10000;

/**
 * R3 deliberately supports a tightly restricted subset of standalone SVG.
 * Build a NEW document from allowlisted elements/attributes instead of embedding
 * untrusted XML. References, scripts, CSS URLs, external images, animation and
 * foreignObject are never included in either the preview or the PDF renderer.
 */
const TAGS = new Set([
  'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon',
  'polyline', 'text', 'tspan',
]);
const SHAPES = new Set([
  'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text',
]);

const ATTRS = new Set([
  'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'd', 'points', 'transform',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity',
  'font-size', 'font-family', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing', 'dx', 'dy',
]);

const STYLE_PROPS = new Set([
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
  'fill-rule', 'opacity', 'fill-opacity', 'stroke-opacity',
  'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor',
]);

export interface SafeSvg {
  markup: string;
  aspectWidth: number;
  aspectHeight: number;
  shapes: number;
  removedElements: number;
}

const geometryValue = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?:px|pt|mm|cm|in|%)?$/i;
const geometryList = /^[-+0-9eE.,\s]+$/;
const pathValue = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\-\s]+$/;

function numericLength(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(px|pt|mm|cm|in)?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = (match[2] || 'px').toLowerCase();
  const ratio = unit === 'in' ? 96 : unit === 'cm' ? 96 / 2.54
    : unit === 'mm' ? 96 / 25.4 : unit === 'pt' ? 96 / 72 : 1;
  const pixels = value * ratio;
  return Number.isFinite(pixels) && pixels > 0 && pixels <= 100000 ? pixels : null;
}

export function parseViewBox(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const values = raw.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some(v => !Number.isFinite(v))) return null;
  if (values[2] <= 0 || values[3] <= 0 || values[2] > 100000 || values[3] > 100000) return null;
  return values as [number, number, number, number];
}

export function vectorFit(
  sourceWidth: number, sourceHeight: number,
  posterWidth: number, posterHeight: number, fit: Fit,
) {
  const factor = fit === 'cover'
    ? Math.max(posterWidth / sourceWidth, posterHeight / sourceHeight)
    : Math.min(posterWidth / sourceWidth, posterHeight / sourceHeight);
  const width = sourceWidth * factor;
  const height = sourceHeight * factor;
  return { x: (posterWidth - width) / 2, y: (posterHeight - height) / 2, width, height };
}

function validTransform(value: string): boolean {
  const normalized = value.trim().replace(
    /(?:translate|scale|rotate|matrix|skewX|skewY)\s*\(\s*[-+0-9eE.,\s]+\s*\)/g,
    '',
  );
  return normalized.trim() === '' && value.trim() !== '';
}

/** Strictly safe presentational value. Reject URL references even from inline styles. */
export function cleanSvgAttribute(name: string, value: string): string | null {
  if (!ATTRS.has(name) || value.length > 40000) return null;
  const v = value.trim();
  if (!v || /url\s*\(|[<>{};\\]|@import|expression|javascript:|data:/i.test(v)) return null;
  if (name === 'd') return pathValue.test(v) ? v : null;
  if (name === 'points' || name === 'stroke-dasharray')
    return geometryList.test(v) ? v : null;
  if (name === 'transform') return validTransform(v) ? v : null;
  if (name === 'fill' || name === 'stroke') {
    return /^(?:none|currentColor|transparent|#[\da-f]{3,8}|[a-z]{1,20}|rgba?\(\s*[-+.\d%,\s]+\))$/i.test(v) ? v : null;
  }
  if (name === 'font-family') return /^[a-z0-9 ,"'_-]{1,100}$/i.test(v) ? v : null;
  if (['stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 'font-style',
    'text-anchor', 'dominant-baseline', 'font-weight'].includes(name)) {
    return /^[a-z0-9-]{1,30}$/i.test(v) ? v : null;
  }
  return geometryValue.test(v) ? v : null;
}

function stylingFor(node: Element): Map<string, string> {
  const values = new Map<string, string>();
  // Inline declarations are copied individually only after validation.
  // HTML/CSS functions, selectors, URLs and imports are never copied.
  const style = node.getAttribute('style') || '';
  if (style && style.length < 3000 && !/url\s*\(|@import|expression|[{}<>]/i.test(style)) {
    for (const declaration of style.split(';')) {
      const position = declaration.indexOf(':');
      if (position < 0) continue;
      const key = declaration.slice(0, position).trim().toLowerCase();
      const value = declaration.slice(position + 1).trim();
      if (STYLE_PROPS.has(key)) {
        const safe = cleanSvgAttribute(key, value);
        if (safe !== null) values.set(key, safe);
      }
    }
  }
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name;
    if (!ATTRS.has(name)) continue;
    const safe = cleanSvgAttribute(name, attr.value);
    if (safe !== null) values.set(name, safe);
  }
  return values;
}

export function sanitizeSvg(input: string): SafeSvg {
  if (!input.trim()) throw new Error('The SVG is empty.');
  if (input.length > SVG_SIZE_LIMIT) throw new Error('SVG exceeds the 2 MB safe import limit.');
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error('SVG document types and entities are unsupported.');
  const raw = new DOMParser().parseFromString(input, 'image/svg+xml');
  if (raw.getElementsByTagName('parsererror').length || raw.documentElement.localName !== 'svg') {
    throw new Error('The file is not a valid standalone SVG.');
  }
  const root = raw.documentElement;
  const viewBox = parseViewBox(root.getAttribute('viewBox'));
  const width = numericLength(root.getAttribute('width'));
  const height = numericLength(root.getAttribute('height'));
  if (!viewBox && (!width || !height)) {
    throw new Error('SVG needs a valid viewBox or a numeric width and height.');
  }
  const [minX, minY, vbWidth, vbHeight] = viewBox || [0, 0, width!, height!];
  const output = document.implementation.createDocument(SVG_NS, 'svg', null);
  const destination = output.documentElement;
  destination.setAttribute('xmlns', SVG_NS);
  destination.setAttribute('viewBox', [minX, minY, vbWidth, vbHeight].join(' '));
  destination.setAttribute('width', String(vbWidth));
  destination.setAttribute('height', String(vbHeight));
  for (const [name, value] of stylingFor(root)) destination.setAttribute(name, value);

  let count = 0;
  let shapeCount = 0;
  let removedElements = 0;
  let chars = 0;
  const walk = (source: Element, target: Element, depth: number): void => {
    if (depth > MAX_DEPTH) throw new Error('SVG nesting exceeds the safety limit.');
    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === 3) {
        if (source.localName === 'text' || source.localName === 'tspan') {
          chars += child.textContent?.length || 0;
          if (chars > MAX_TEXT) throw new Error('SVG text exceeds the safe import limit.');
          target.appendChild(output.createTextNode(child.textContent || ''));
        }
        continue;
      }
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      const tag = element.localName;
      if (!TAGS.has(tag) || element.namespaceURI !== SVG_NS) {
        removedElements++;
        continue;
      }
      count++;
      if (count > MAX_ELEMENTS) throw new Error('SVG contains too many drawing elements.');
      if (SHAPES.has(tag)) shapeCount++;
      const clean = output.createElementNS(SVG_NS, tag);
      for (const [name, value] of stylingFor(element)) clean.setAttribute(name, value);
      target.appendChild(clean);
      walk(element, clean, depth + 1);
    }
  };
  walk(root, destination, 0);
  if (shapeCount === 0) throw new Error('No supported vector shapes were found in this SVG.');
  return {
    markup: new XMLSerializer().serializeToString(output),
    aspectWidth: vbWidth,
    aspectHeight: vbHeight,
    shapes: shapeCount,
    removedElements,
  };
}

/**
 * The sanitized markup is reconstructed from scratch in a new SVG document.
 * No original user-supplied nodes or link attributes enter the PDF converter.
 */
export function trustedSvgElement(markup: string): SVGSVGElement {
  const documentSvg = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return document.importNode(documentSvg.documentElement, true) as unknown as SVGSVGElement;
}
