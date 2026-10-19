// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanSvgAttribute, parseViewBox, sanitizeSvg, vectorFit } from './svg';

describe('SVG Studio geometry and safe import', () => {
  it('preserves simple, vector-only paths, shapes and text', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">' +
      '<g style="stroke:#123456;stroke-width:2;fill:none">' +
      '<path d="M 0 0 L 500 200"/><circle cx="50" cy="50" r="12"/>' +
      '<text x="30" y="90">Router A</text></g></svg>';
    const result = sanitizeSvg(svg);
    expect(result.shapes).toBe(3);
    expect(result.aspectWidth).toBe(600);
    expect(result.aspectHeight).toBe(300);
    expect(result.markup).toContain('stroke="#123456"');
    expect(result.markup).toContain('Router A');
  });

  it('drops script, foreignObject, external assets, and event handlers', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" ' +
      'onload="alert(1)"><script>alert(9)</script>' +
      '<image href="https://evil.invalid/track.png"/>' +
      '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">bad</div></foreignObject>' +
      '<rect width="400" height="200" fill="url(https://evil.invalid/a.svg#paint)" onclick="alert(1)"/>' +
      '<path d="M0 0 L100 100" stroke="#222"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.removedElements).toBe(3);
    expect(result.markup).not.toMatch(/<script|<image|foreignObject|https:|onload|onclick|url\(/i);
    expect(result.markup).toContain('<path');
    expect(result.markup).not.toContain('alert');
  });

  it('rejects invalid sources and unbounded payloads', () => {
    expect(() => sanitizeSvg('<svg><path d="M0 0"/></svg>')).toThrow(/viewBox|width/i);
    expect(() => sanitizeSvg('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>')).toThrow();
    expect(() => sanitizeSvg('<svg')).toThrow();
    expect(() => sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><image href="file:///secret"/></svg>')).toThrow(/No supported/);
  });

  it('rejects dangerous URLs, malformed paths and transforms', () => {
    expect(cleanSvgAttribute('fill', 'url(#gradient)')).toBeNull();
    expect(cleanSvgAttribute('href', 'https://evil.invalid')).toBeNull();
    expect(cleanSvgAttribute('d', 'M0 0 L10 20')).toBe('M0 0 L10 20');
    expect(cleanSvgAttribute('d', 'M0 0 <script>')).toBeNull();
    expect(cleanSvgAttribute('transform', 'translate(10 2) rotate(90)')).toBeTruthy();
    expect(cleanSvgAttribute('transform', 'translate(1) url(http://x)')).toBeNull();
  });

  it('honors cover and contain without changing original geometry', () => {
    expect(vectorFit(1000, 500, 20, 20, 'contain')).toEqual({ x: 0, y: 5, width: 20, height: 10 });
    expect(vectorFit(1000, 500, 20, 20, 'cover')).toEqual({ x: -10, y: 0, width: 40, height: 20 });
    expect(parseViewBox('0,0 500 250')).toEqual([0, 0, 500, 250]);
    expect(parseViewBox('0 0 -3 50')).toBeNull();
  });
});
