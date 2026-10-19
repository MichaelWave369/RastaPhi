import { parseProjectJSON, projectFilename, type ProjectAsset, type RastaProject } from './project';
import { sanitizeSvg, type SafeSvg } from './svg';

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') reject(new Error('Unable to read source image.'));
      else resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not embed the source image into the project file.'));
    reader.readAsDataURL(file);
  });
}

export async function captureProjectAsset(
  image: HTMLImageElement,
  name: string,
  rasterFile: File | null,
  svgSource: SafeSvg | null,
): Promise<ProjectAsset> {
  if (svgSource) {
    return { kind: 'svg', name, markup: svgSource.markup };
  }
  const dataUrl = rasterFile ? await readAsDataURL(rasterFile) : image.src;
  if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(dataUrl)) {
    throw new Error('Unable to package this image. Try loading the original source file again.');
  }
  return { kind: 'raster', name, dataUrl };
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Saved artwork could not be displayed.'));
    image.src = src;
  });
}

export async function restoreProjectAsset(
  asset: ProjectAsset,
): Promise<{ image: HTMLImageElement; svg: SafeSvg | null }> {
  if (asset.kind === 'raster') {
    return { image: await decodeImage(asset.dataUrl), svg: null };
  }
  // Re-sanitize on every project load, including local IndexedDB entries.
  const safe = sanitizeSvg(asset.markup);
  const url = URL.createObjectURL(new Blob([safe.markup], { type: 'image/svg+xml' }));
  try {
    return { image: await decodeImage(url), svg: safe };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function importProjectFile(file: File): Promise<RastaProject> {
  if (file.size > 44 * 1024 * 1024) throw new Error('Project file must be smaller than 44 MB.');
  return parseProjectJSON(await file.text());
}

export function exportProjectFile(project: RastaProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = projectFilename(project.title);
  link.style.display = 'none';
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
