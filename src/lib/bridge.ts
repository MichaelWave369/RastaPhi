import {
  MAX_PROJECT_BYTES, PROJECT_VERSION, validateProject,
  type ProjectAsset, type ProjectSettings, type RastaProject,
} from './project';
import { validateGalleryLink } from './gallery';

export const BRIDGE_FORMAT = 'rastaphi-creative-bridge';
export const BRIDGE_VERSION = 1;

export interface CreativeBridge {
  format: typeof BRIDGE_FORMAT;
  version: typeof BRIDGE_VERSION;
  sourceApp: string;
  sourceUrl: string;
  creator: string;
  title: string;
  createdAt: string;
  asset: ProjectAsset;
  /** Optional for third-party exporters: imports otherwise use current RastaPhi print settings. */
  settings?: ProjectSettings;
}

function humanText(value: unknown, field: string, limit: number, required = false): string {
  if (typeof value !== 'string' || value.length > limit ||
      /[\u0000-\u001f\u007f<>]/.test(value) || (required && !value.trim())) {
    throw new Error('Invalid Creative Bridge ' + field + '.');
  }
  return value.trim();
}

/**
 * Portable, explicitly imported JSON. Embedded art only: never fetch remote artwork
 * or execute scripts. Reuse RastaPhi's strict project validation for the asset.
 */
export function bridgeToProject(value: unknown, fallbackSettings: ProjectSettings): {
  bridge: CreativeBridge;
  project: RastaProject;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('This is not a Creative Bridge handoff.');
  }
  const x = value as Record<string, unknown>;
  if (x.format !== BRIDGE_FORMAT || x.version !== BRIDGE_VERSION) {
    throw new Error('Unsupported Creative Bridge format or version.');
  }
  const sourceApp = humanText(x.sourceApp, 'source application', 80, true);
  const sourceUrl = validateGalleryLink(x.sourceUrl ?? '');
  const creator = humanText(x.creator ?? '', 'creator', 100);
  const title = humanText(x.title, 'title', 100, true);
  const createdAt = humanText(x.createdAt, 'creation date', 45, true);
  if (!Number.isFinite(Date.parse(createdAt)) || !/^\d{4}-\d\d-\d\dT/.test(createdAt)) {
    throw new Error('Creative Bridge creation date must be an ISO timestamp.');
  }
  // Treat settings as a whole instead of merging untrusted properties into defaults.
  // A third-party file may omit settings entirely.
  const settings = x.settings === undefined ? fallbackSettings : x.settings;
  const project = validateProject({
    format: 'rastaphi-project', version: PROJECT_VERSION,
    title, savedAt: createdAt, settings, asset: x.asset,
  });
  // Construct our own vetted bridge record; unknown incoming fields are discarded.
  const bridge: CreativeBridge = {
    format: BRIDGE_FORMAT, version: BRIDGE_VERSION,
    sourceApp, sourceUrl, creator, title, createdAt, asset: project.asset,
    ...(x.settings !== undefined ? { settings: project.settings } : {}),
  };
  return { bridge, project };
}

export function createCreativeBridge(project: RastaProject): CreativeBridge {
  const safe = validateProject(project);
  return {
    format: BRIDGE_FORMAT, version: BRIDGE_VERSION,
    sourceApp: 'RastaPhi', sourceUrl: 'https://michaelwave369.github.io/RastaPhi/',
    creator: '', title: safe.title, createdAt: safe.savedAt,
    settings: safe.settings, asset: safe.asset,
  };
}

export function parseCreativeBridgeJSON(text: string, settings: ProjectSettings) {
  if (new Blob([text]).size > MAX_PROJECT_BYTES) {
    throw new Error('Creative Bridge file exceeds the 44 MB import limit.');
  }
  let source: unknown;
  try { source = JSON.parse(text); }
  catch { throw new Error('Creative Bridge JSON is malformed.'); }
  return bridgeToProject(source, settings);
}

export function bridgeFilename(title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 55);
  return (slug || 'creative-artwork') + '.rastaphi-bridge.json';
}
