import { describe, expect, it } from 'vitest';
import {
  BRIDGE_FORMAT, BRIDGE_VERSION, bridgeFilename, bridgeToProject,
  createCreativeBridge, parseCreativeBridgeJSON,
} from './bridge';
import { type ProjectSettings, type RastaProject } from './project';

const settings: ProjectSettings = {
  posterWidth: 24, posterHeight: 36, ratioLocked: false,
  paper: 'letter', orientation: 'portrait', margin: .4, overlap: .2,
  fit: 'contain', effect: 'original', dotSizeMm: 4,
  ink: '#122334', paperColor: '#ffffff', guide: true, grid: false,
  blueprint: { step: 'off', ink: 'cyan', coordinates: false },
  blankBlueprint: false, selectedSheet: 1, view: 'wall',
};

const raster = { kind: 'raster' as const, name: 'gallery.png',
  dataUrl: 'data:image/png;base64,' + btoa('image pixels') };
const input = {
  format: BRIDGE_FORMAT, version: BRIDGE_VERSION,
  sourceApp: 'Silicon Louvre', sourceUrl: 'https://example.org/louvre',
  creator: 'Artist', title: 'The Stillness That Moves',
  createdAt: '2026-10-19T20:00:00.000Z', asset: raster,
};

describe('RastaPhi Creative Bridge v1', () => {
  it('imports a third-party artwork with fallback printer settings', () => {
    const { project, bridge } = bridgeToProject(input, settings);
    expect(project.asset).toEqual(raster);
    expect(project.settings).toEqual(settings);
    expect(bridge.sourceApp).toBe('Silicon Louvre');
    expect(bridge.settings).toBeUndefined();
  });

  it('exports a first-party project as a reversible bridge without losing print options', () => {
    const original: RastaProject = {
      format: 'rastaphi-project', version: 2, title: 'Sisters of Shasta',
      savedAt: '2026-10-19T20:00:00.000Z', settings, asset: raster,
    };
    const handoff = createCreativeBridge(original);
    const reopened = parseCreativeBridgeJSON(JSON.stringify(handoff), {
      ...settings, posterWidth: 10,
    });
    expect(reopened.project).toEqual(original);
    expect(reopened.bridge.sourceApp).toBe('RastaPhi');
  });

  it('accepts self-contained SVG and editable multi-photo exhibits', () => {
    const svg = { ...input, asset: {
      kind: 'svg', name: 'architecture.svg',
      markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><path d="M0 0L10 10"/></svg>',
    }};
    expect(bridgeToProject(svg, settings).project.asset.kind).toBe('svg');
    const mosaic = { ...input, asset: {
      kind: 'mosaic', name: 'Gallery Wall',
      photos: [{ name: 'photo.jpg', dataUrl: 'data:image/jpeg;base64,' + btoa('jpeg'),
        title: 'Blue Flame', artist: 'Helion', url: 'https://example.org/blue-flame' }],
      columns: 1, gapPercent: 2, fit: 'contain', background: '#ffffff',
      gallery: { enabled: true, title: 'Beacon', subtitle: 'First Light', showQr: true },
    }};
    expect(bridgeToProject(mosaic, settings).project.asset.kind).toBe('mosaic');
  });

  it('rejects remote-only images and invalid source metadata', () => {
    expect(() => bridgeToProject({ ...input, asset: {
      kind: 'raster', name: 'image.png', dataUrl: 'https://example.org/img.png',
    } }, settings)).toThrow();
    expect(() => bridgeToProject({ ...input, sourceUrl: 'javascript:alert(1)' }, settings)).toThrow();
    expect(() => bridgeToProject({ ...input, sourceApp: '<script>' }, settings)).not.toThrow();
    expect(() => bridgeToProject({ ...input, sourceApp: '' }, settings)).toThrow();
    expect(() => bridgeToProject({ ...input, version: 99 }, settings)).toThrow(/version/);
    expect(() => bridgeToProject({ ...input, settings: { ...settings, posterWidth: -2 } }, settings)).toThrow();
  });

  it('enforces safe JSON parsing and filenames', () => {
    expect(() => parseCreativeBridgeJSON('{bad', settings)).toThrow(/malformed/);
    expect(bridgeFilename('My Exhibit 2026')).toBe('my-exhibit-2026.rastaphi-bridge.json');
    expect(bridgeFilename('✦')).toBe('creative-artwork.rastaphi-bridge.json');
  });
});
