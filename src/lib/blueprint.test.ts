import { describe, expect, it } from 'vitest';
import { axisPositions, formatPosterCoordinate, gridLinesForTile, stepInches } from './blueprint';
import { buildLayout } from './layout';

describe('physical blueprint grid', () => {
  it('uses real centimeter and inch spacing', () => {
    expect(stepInches('centimeter') * 2.54).toBeCloseTo(1, 9);
    expect(stepInches('five-centimeters') * 2.54).toBeCloseTo(5, 9);
    expect(stepInches('half-inch')).toBe(.5);
    expect(stepInches('off')).toBe(0);
  });

  it('counts only gridlines in a bounded range', () => {
    expect(axisPositions(1.1, 3.6, .5)).toEqual([1.5, 2, 2.5, 3, 3.5]);
    expect(axisPositions(0, 1, 0)).toEqual([]);
    expect(axisPositions(3, 1, 1)).toEqual([]);
  });

  it('maintains the same global grid origin on two overlapping sheets', () => {
    const layout = buildLayout({
      posterWidth: 20, posterHeight: 22, paper: 'letter', orientation: 'portrait',
      margin: .4, overlap: .4,
    });
    const first = gridLinesForTile(layout.tiles[0], 'quarter-inch');
    const second = gridLinesForTile(layout.tiles[1], 'quarter-inch');
    const shared = first.x.filter(x => second.x.includes(x));
    expect(shared.length).toBeGreaterThan(0);
    expect(second.x[0]).toBeGreaterThanOrEqual(layout.tiles[1].x - 1e-8);
  });

  it('has unambiguous coordinate labels in each system', () => {
    expect(formatPosterCoordinate(1, 'inch')).toBe('1 in');
    expect(formatPosterCoordinate(1, 'centimeter')).toBe('2.54 cm');
    expect(formatPosterCoordinate(0, 'five-centimeters')).toBe('0 cm');
  });

  it('disables drawing when the overlay is off', () => {
    const tile = { x: 0, y: 0, width: 12, height: 9, index: 1, col: 0, row: 0 };
    expect(gridLinesForTile(tile, 'off')).toEqual({ x: [], y: [] });
  });
});
