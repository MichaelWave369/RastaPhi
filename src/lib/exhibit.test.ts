import { describe, it, expect } from 'vitest';
import {
  createExhibitManifest, exhibitManifestFilename, placardPages, placardSheetIndex,
} from './exhibit';
import type { MosaicRecipe } from './mosaic';

const image = 'data:image/jpeg;base64,' + btoa('example pixels');
const recipe = (): MosaicRecipe => ({
  kind: 'mosaic',
  name: 'My saved art show',
  columns: 2, gapPercent: 3, fit: 'cover', background: '#ffffff',
  gallery: {
    enabled: true,
    title: 'The Stillness That Moves',
    subtitle: 'Silicon Louvre / Volume One',
    showQr: true,
  },
  photos: [
    { name: 'left.jpg', dataUrl: image, title: 'The Left Door', artist: 'An Artist', url: 'https://example.org/a' },
    { name: 'right.jpg', dataUrl: image, title: 'The Right Door', artist: '', url: '' },
    { name: 'third.jpg', dataUrl: image },
  ],
});

describe('Exhibit Kit manifest', () => {
  it('keeps exhibit order, names, credits and links while omitting source imagery', () => {
    const result = createExhibitManifest(recipe());
    expect(result.format).toBe('rastaphi-exhibit-manifest');
    expect(result.version).toBe(1);
    expect(result.exhibition).toBe('The Stillness That Moves');
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toEqual({
      number: 1, title: 'The Left Door', credit: 'An Artist',
      sourceName: 'left.jpg', url: 'https://example.org/a',
    });
    expect(result.items[2].title).toBe('third');
    const json = JSON.stringify(result);
    expect(json).not.toContain('data:image');
    expect(json).not.toContain('example pixels');
  });

  it('refuses to package an ordinary collage with gallery mode switched off', () => {
    const r = recipe();
    r.gallery = { ...r.gallery!, enabled: false };
    expect(() => createExhibitManifest(r)).toThrow(/Enable Gallery/);
    delete r.gallery;
    expect(() => createExhibitManifest(r)).toThrow(/Enable Gallery/);
  });

  it('validates URLs before packaging even when the fields are edited externally', () => {
    const r = recipe();
    r.photos[0].url = 'javascript:alert(1)';
    expect(() => createExhibitManifest(r)).toThrow(/HTTPS/);
  });

  it('calculates placard sheets with stable two-up numbering', () => {
    expect(placardPages(0)).toBe(0);
    expect(placardPages(1)).toBe(1);
    expect(placardPages(2)).toBe(1);
    expect(placardPages(3)).toBe(2);
    expect(placardPages(12)).toBe(6);
    expect(placardSheetIndex(0)).toEqual({ page: 0, slot: 0 });
    expect(placardSheetIndex(1)).toEqual({ page: 0, slot: 1 });
    expect(placardSheetIndex(2)).toEqual({ page: 1, slot: 0 });
    expect(() => placardPages(13)).toThrow();
    expect(() => placardSheetIndex(-1)).toThrow();
  });

  it('exports clean filenames without embedding user-supplied path separators', () => {
    expect(exhibitManifestFilename('The Stillness That Moves')).toBe('the-stillness-that-moves-manifest.json');
    expect(exhibitManifestFilename('🎨')).toBe('exhibit-manifest.json');
  });
});
