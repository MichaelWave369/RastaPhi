import type { Tile } from './layout';

export type GridStep = 'off' | 'quarter-inch' | 'half-inch' | 'inch' | 'centimeter' | 'five-centimeters';
export type GridInk = 'cyan' | 'slate';

export interface BlueprintOptions {
  step: GridStep;
  ink: GridInk;
  coordinates: boolean;
}

export const GRID_STEP_INCHES: Record<Exclude<GridStep, 'off'>, number> = {
  'quarter-inch': .25,
  'half-inch': .5,
  'inch': 1,
  'centimeter': 1 / 2.54,
  'five-centimeters': 5 / 2.54,
};

export const GRID_INK_RGB: Record<GridInk, [number, number, number]> = {
  cyan: [30, 140, 170],
  slate: [105, 115, 126],
};

export function stepInches(step: GridStep): number {
  return step === 'off' ? 0 : GRID_STEP_INCHES[step];
}

/** Generate global (poster-origin) positions. Never restart the grid for each tile. */
export function axisPositions(startInches: number, endInches: number, step: number): number[] {
  if (![startInches, endInches, step].every(Number.isFinite) ||
      step <= 0 || endInches < startInches) return [];
  const first = Math.max(0, Math.ceil((startInches - 1e-8) / step));
  const last = Math.floor((endInches + 1e-8) / step);
  if (last < first || last - first + 1 > 1024) return [];
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) * step);
}

export function gridLinesForRegion(
  originX: number,
  originY: number,
  spanWidth: number,
  spanHeight: number,
  step: GridStep,
): { x: number[]; y: number[] } {
  const spacing = stepInches(step);
  return {
    x: axisPositions(originX, originX + spanWidth, spacing),
    y: axisPositions(originY, originY + spanHeight, spacing),
  };
}

/** Printed sheet coordinates refer to the actual poster content, not paper margins. */
export function gridLinesForTile(tile: Tile, step: GridStep) {
  return gridLinesForRegion(tile.x, tile.y, tile.width, tile.height, step);
}

export function formatPosterCoordinate(inches: number, step: GridStep): string {
  const cm = step === 'centimeter' || step === 'five-centimeters';
  const value = cm ? inches * 2.54 : inches;
  const num = Number(value.toFixed(2));
  return num.toString() + (cm ? ' cm' : ' in');
}
