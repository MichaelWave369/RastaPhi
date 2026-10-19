import { buildLayout, type Effect, type Fit, type Orientation, type Paper } from './layout';
import type { GridInk, GridStep, BlueprintOptions } from './blueprint';

export const PROJECT_FORMAT = 'rastaphi-project';
export const PROJECT_VERSION = 1;
export const MAX_PROJECT_BYTES = 44 * 1024 * 1024;
export const MAX_RASTER_DATA_URL_LENGTH = 42 * 1024 * 1024;
export const MAX_SVG_MARKUP_LENGTH = 3 * 1024 * 1024;

export interface ProjectSettings {
  posterWidth: number;
  posterHeight: number;
  ratioLocked: boolean;
  paper: Paper;
  orientation: Orientation;
  margin: number;
  overlap: number;
  fit: Fit;
  effect: Effect;
  dotSizeMm: number;
  ink: string;
  paperColor: string;
  guide: boolean;
  grid: boolean;
  blueprint: BlueprintOptions;
  blankBlueprint: boolean;
  selectedSheet: number;
  view: 'wall' | 'map' | 'sheet';
}

export type ProjectAsset =
  | { kind: 'raster'; name: string; dataUrl: string }
  | { kind: 'svg'; name: string; markup: string };

export interface RastaProject {
  format: typeof PROJECT_FORMAT;
  version: typeof PROJECT_VERSION;
  title: string;
  savedAt: string;
  settings: ProjectSettings;
  asset: ProjectAsset;
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Not a valid RastaPhi project object.');
  }
  return input as Record<string, unknown>;
}
function inList<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === 'string' && choices.includes(value as T);
}
function real(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function bool(value: unknown): value is boolean { return typeof value === 'boolean'; }
function hex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}
function named(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export function validateProject(input: unknown): RastaProject {
  const obj = record(input);
  if (obj.format !== PROJECT_FORMAT || obj.version !== PROJECT_VERSION) {
    throw new Error('Unsupported project format or version. This version of RastaPhi opens v1 projects.');
  }
  if (!named(obj.title, 100) || typeof obj.savedAt !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(obj.savedAt) ||
    !Number.isFinite(Date.parse(obj.savedAt))) {
    throw new Error('Project name or save timestamp is invalid.');
  }
  const s = record(obj.settings);
  if (!real(s.posterWidth, 1, 120) || !real(s.posterHeight, 1, 120) ||
    !bool(s.ratioLocked) || !inList(s.paper, ['letter', 'a4', 'a3'] as const) ||
    !inList(s.orientation, ['portrait', 'landscape'] as const) ||
    !real(s.margin, 0, 1.5) || !real(s.overlap, 0, 1) ||
    !inList(s.fit, ['cover', 'contain'] as const) ||
    !inList(s.effect, ['original', 'mono', 'halftone', 'duotone'] as const) ||
    !real(s.dotSizeMm, 2, 12) || !hex(s.ink) || !hex(s.paperColor) ||
    !bool(s.guide) || !bool(s.grid) || !bool(s.blankBlueprint) ||
    !inList(s.view, ['wall', 'map', 'sheet'] as const) ||
    !real(s.selectedSheet, 1, 300) || !Number.isInteger(s.selectedSheet)) {
    throw new Error('Project settings are incomplete or outside supported limits.');
  }
  const b = record(s.blueprint);
  if (!inList(b.step, ['off', 'quarter-inch', 'half-inch', 'inch', 'centimeter', 'five-centimeters'] as const) ||
    !inList(b.ink, ['cyan', 'slate'] as const) ||
    !bool(b.coordinates)) {
    throw new Error('Invalid blueprint grid settings.');
  }
  // Reuse the actual print-layout engine as the source of truth.
  const layout = buildLayout({
    posterWidth: s.posterWidth, posterHeight: s.posterHeight,
    paper: s.paper, orientation: s.orientation, margin: s.margin, overlap: s.overlap,
  });
  if (s.selectedSheet > layout.total) throw new Error('Saved sheet selection is outside the poster layout.');
  const asset = record(obj.asset);
  if (!named(asset.name, 160)) throw new Error('Project artwork name is invalid.');
  if (asset.kind === 'svg') {
    if (typeof asset.markup !== 'string' || asset.markup.length > MAX_SVG_MARKUP_LENGTH ||
      !asset.markup.includes('<svg')) throw new Error('SVG artwork is missing or exceeds the project limit.');
  } else if (asset.kind === 'raster') {
    if (typeof asset.dataUrl !== 'string' ||
      asset.dataUrl.length > MAX_RASTER_DATA_URL_LENGTH ||
      !/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=\r\n]+$/.test(asset.dataUrl)) {
      throw new Error('Project raster image is missing, too large, or not a supported embedded image.');
    }
  } else {
    throw new Error('Project artwork type is not supported.');
  }
  return input as RastaProject;
}

export function parseProjectJSON(text: string): RastaProject {
  if (new Blob([text]).size > MAX_PROJECT_BYTES) {
    throw new Error('Project file exceeds the 44 MB import limit.');
  }
  let input: unknown;
  try { input = JSON.parse(text); }
  catch { throw new Error('Could not read the project JSON file.'); }
  return validateProject(input);
}

export function projectFilename(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55);
  return (slug || 'rastaphi-project') + '.rastaphi.json';
}
