import { describe, expect, it } from 'vitest';
import { mosaicCells, validateMosaic, type MosaicRecipe } from './mosaic';
import { validateProject, type RastaProject } from './project';

const sample = 'data:image/jpeg;base64,' + btoa('image bytes');
const recipe = (): MosaicRecipe => ({
  kind: 'mosaic', name: 'Photo wall',
  photos: [
    { name: 'one.jpg', dataUrl: sample },
    { name: 'two.jpg', dataUrl: sample },
    { name: 'three.jpg', dataUrl: sample },
  ],
  columns: 2, gapPercent: 4, background: '#ffffff', fit: 'cover',
});

describe('MosaicLab editable recipe', () => {
  it('creates deterministic row-major geometry for an incomplete row', () => {
    const cells = mosaicCells(3, 2, 600, 900, 4);
    expect(cells).toHaveLength(3);
    expect(cells[0].row).toBe(0);
    expect(cells[0].col).toBe(0);
    expect(cells[1].col).toBe(1);
    expect(cells[2].row).toBe(1);
    expect(cells[2].col).toBe(0);
    expect(cells[0].x).toBeGreaterThan(0);
    expect(cells[0].width + cells[0].x).toBeLessThan(300);
  });

  it('validates source image embeds and grid controls', () => {
    expect(validateMosaic(recipe()).photos).toHaveLength(3);
    expect(() => validateMosaic({ ...recipe(), columns: 0 })).toThrow();
    expect(() => validateMosaic({ ...recipe(), gapPercent: 200 })).toThrow();
    expect(() => validateMosaic({ ...recipe(), photos: [] })).toThrow();
    expect(() => validateMosaic({ ...recipe(), photos: [
      { name: 'remote', dataUrl: 'https://example.invalid/picture.png' },
    ] })).toThrow();
    expect(() => validateMosaic({ ...recipe(), photos: Array(13).fill(recipe().photos[0]) })).toThrow();
  });

  it('accepts v2 mosaic project but rejects it under the legacy v1 schema', () => {
    const project: RastaProject = {
      format: 'rastaphi-project',
      version: 2,
      title: 'My mosaic',
      savedAt: '2026-10-19T23:00:00.000Z',
      settings: {
        posterWidth: 24, posterHeight: 36, ratioLocked: false,
        paper: 'letter', orientation: 'portrait', margin: .4, overlap: .2,
        fit: 'contain', effect: 'original', dotSizeMm: 4, ink: '#111111',
        paperColor: '#ffffff', guide: true, grid: true,
        blueprint: { step: 'off', ink: 'cyan', coordinates: false },
        blankBlueprint: false, selectedSheet: 1, view: 'wall',
      },
      asset: recipe(),
    };
    expect(validateProject(project).asset.kind).toBe('mosaic');
    expect(() => validateProject({ ...project, version: 1 })).toThrow();
  });
});
