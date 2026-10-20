import type { MosaicRecipe } from './mosaic';
import { cleanGalleryText, validateGalleryLink } from './gallery';
import { validateMosaic } from './mosaic';

export interface ExhibitItem {
  number: number;
  title: string;
  credit: string;
  sourceName: string;
  url: string;
}

export interface ExhibitManifest {
  format: 'rastaphi-exhibit-manifest';
  version: 1;
  exhibition: string;
  subtitle: string;
  items: ExhibitItem[];
}

export const PLACARDS_PER_PAGE = 2;

export function createExhibitManifest(input: MosaicRecipe): ExhibitManifest {
  const recipe = validateMosaic(input);
  const gallery = recipe.gallery;
  if (!gallery?.enabled) throw new Error('Enable Gallery Composer to create an Exhibit Kit.');
  return {
    format: 'rastaphi-exhibit-manifest',
    version: 1,
    exhibition: cleanGalleryText(gallery.title, 90) || recipe.name,
    subtitle: cleanGalleryText(gallery.subtitle, 140),
    items: recipe.photos.map((photo, index) => ({
      number: index + 1,
      title: cleanGalleryText(photo.title ?? '', 90) || photo.name.replace(/\.[^.]+$/, ''),
      credit: cleanGalleryText(photo.artist ?? '', 80),
      sourceName: photo.name,
      url: validateGalleryLink(photo.url ?? ''),
    })),
  };
}

export function placardPages(count: number): number {
  if (!Number.isInteger(count) || count < 0 || count > 12) throw new Error('Invalid exhibit artwork count.');
  return Math.ceil(count / PLACARDS_PER_PAGE);
}

export function placardSheetIndex(itemIndex: number): { page: number; slot: number } {
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= 12) {
    throw new Error('Invalid placard item.');
  }
  return { page: Math.floor(itemIndex / PLACARDS_PER_PAGE), slot: itemIndex % PLACARDS_PER_PAGE };
}

export function exhibitManifestFilename(title: string): string {
  const name = title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55);
  return (name || 'exhibit') + '-manifest.json';
}

export function downloadExhibitManifest(recipe: MosaicRecipe): void {
  const manifest = createExhibitManifest(recipe);
  const payload = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(payload);
  const a = document.createElement('a');
  a.href = url;
  a.download = exhibitManifestFilename(manifest.exhibition);
  document.body.appendChild(a);
  try { a.click(); }
  finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
