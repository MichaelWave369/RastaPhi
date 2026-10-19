import { describe, expect, it } from 'vitest';
import {
  MAX_PROJECT_BYTES, parseProjectJSON, projectFilename, validateProject,
  type RastaProject,
} from './project';

const raster = 'data:image/png;base64,' + btoa('safe-image');
function fixture(): RastaProject {
  return {
    format: 'rastaphi-project',
    version: 1,
    title: 'Network mural',
    savedAt: '2026-10-19T21:00:00.000Z',
    asset: { kind: 'raster', name: 'map.png', dataUrl: raster },
    settings: {
      posterWidth: 24, posterHeight: 36, ratioLocked: false,
      paper: 'letter', orientation: 'portrait', margin: .4, overlap: .2,
      fit: 'contain', effect: 'halftone', dotSizeMm: 4,
      ink: '#123456', paperColor: '#f8eed9', guide: true, grid: false,
      blueprint: { step: 'inch', ink: 'cyan', coordinates: true },
      blankBlueprint: false, selectedSheet: 2, view: 'sheet',
    },
  };
}

describe('RastaPhi Project Vault format', () => {
  it('round trips all settings and a raster asset', () => {
    const p = fixture();
    expect(parseProjectJSON(JSON.stringify(p))).toEqual(p);
  });
  it('supports sanitized SVG markup records', () => {
    const p: RastaProject = {
      ...fixture(),
      asset: { kind: 'svg', name: 'topology.svg', markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M0 0L40 40"/></svg>' },
    };
    expect(validateProject(p)).toEqual(p);
  });
  it('rejects unsupported format, bad dimensions and unsafe asset types', () => {
    expect(() => validateProject({ ...fixture(), version: 999 })).toThrow(/Unsupported/);
    expect(() => validateProject({ ...fixture(), settings: { ...fixture().settings, posterWidth: -1 } })).toThrow();
    expect(() => validateProject({ ...fixture(), settings: { ...fixture().settings, overlap: 8 } })).toThrow();
    expect(() => validateProject({ ...fixture(), asset: { kind: 'raster', name: 'x', dataUrl: 'https://example.com/tracker.png' } })).toThrow();
    expect(() => validateProject({ ...fixture(), asset: { kind: 'iframe', name: 'x', src: 'https://example.com' } })).toThrow();
  });
  it('rejects unknown grid setting and broken JSON', () => {
    expect(() => validateProject({ ...fixture(), settings: {
      ...fixture().settings, blueprint: { step: 'wrong', ink: 'cyan', coordinates: false },
    } })).toThrow(/grid/);
    expect(() => parseProjectJSON('{hello')).toThrow(/JSON/);
    expect(() => parseProjectJSON(' '.repeat(MAX_PROJECT_BYTES + 1))).toThrow(/limit/);
  });
  it('prevents invalid file names and normalizes downloadable names', () => {
    expect(() => validateProject({ ...fixture(), title: 'bad\nname' })).toThrow();
    expect(projectFilename('My Big Network Wall!')).toBe('my-big-network-wall.rastaphi.json');
    expect(projectFilename('✨')).toBe('rastaphi-project.rastaphi.json');
  });
});
