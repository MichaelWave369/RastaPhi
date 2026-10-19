import { describe, it, expect } from 'vitest';
import { buildLayout, PAPER_INCHES } from './layout';

const base = {
  posterWidth: 24,
  posterHeight: 36,
  paper: 'letter' as const,
  orientation: 'portrait' as const,
  margin: 0.25,
  overlap: 0.25,
};

describe('print tiling geometry', () => {
  it('produces row-major tiles with reliable indices', () => {
    const result = buildLayout(base);
    expect(result.total).toBe(result.rows * result.columns);
    expect(result.tiles[0]).toMatchObject({ row: 0, col: 0, index: 1, x: 0, y: 0 });
    expect(result.tiles[1].col).toBe(1);
    expect(result.tiles[result.tiles.length - 1].index).toBe(result.total);
  });

  it('fits an exact printable area on one sheet', () => {
    const result = buildLayout({ ...base, posterWidth: 8, posterHeight: 10.5 });
    expect(result.total).toBe(1);
  });

  it('uses physical page sizes and flips for landscape', () => {
    const p = buildLayout(base);
    const l = buildLayout({ ...base, orientation: 'landscape' });
    expect(p.pageWidth).toBe(PAPER_INCHES.letter[0]);
    expect(l.pageWidth).toBe(PAPER_INCHES.letter[1]);
    expect(l.pageHeight).toBe(PAPER_INCHES.letter[0]);
  });

  it('covers the requested poster dimensions without gaps', () => {
    const result = buildLayout(base);
    const right = Math.max(...result.tiles.map(t => t.x + t.width));
    const bottom = Math.max(...result.tiles.map(t => t.y + t.height));
    expect(right).toBeCloseTo(base.posterWidth, 5);
    expect(bottom).toBeCloseTo(base.posterHeight, 5);
    for (const tile of result.tiles) {
      expect(tile.width).toBeGreaterThan(0);
      expect(tile.height).toBeGreaterThan(0);
    }
  });

  it('has consistent overlap between neighboring full-sized tiles', () => {
    const result = buildLayout(base);
    expect(result.tiles[0].x + result.usableWidth - result.tiles[1].x).toBeCloseTo(base.overlap);
    expect(result.tiles[0].y + result.usableHeight - result.tiles[result.columns].y).toBeCloseTo(base.overlap);
  });

  it('rejects bad dimensions and overlap', () => {
    expect(() => buildLayout({ ...base, posterWidth: 0 })).toThrow();
    expect(() => buildLayout({ ...base, overlap: 9 })).toThrow();
    expect(() => buildLayout({ ...base, margin: -1 })).toThrow();
    expect(() => buildLayout({ ...base, posterWidth: 1500, posterHeight: 1500 })).toThrow();
  });
});
