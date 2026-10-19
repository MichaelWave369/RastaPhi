import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Grid2X2, ImagePlus, Layers3, Trash2 } from 'lucide-react';
import {
  MAX_MOSAIC_PHOTOS, optimizeMosaicFile, validateMosaic, type MosaicRecipe,
} from './lib/mosaic';

interface MosaicProps {
  recipe: MosaicRecipe | null;
  onChange: (recipe: MosaicRecipe | null) => void;
  flatten: () => void;
}

const starter: MosaicRecipe = {
  kind: 'mosaic', name: 'MosaicLab photo wall', photos: [],
  columns: 3, gapPercent: 3, background: '#ffffff', fit: 'cover',
};

export default function MosaicLab({ recipe, onChange, flatten }: MosaicProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function update(next: MosaicRecipe) {
    try {
      onChange(validateMosaic(next));
      setMessage('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to update collage.');
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    const current = recipe || starter;
    const remaining = MAX_MOSAIC_PHOTOS - current.photos.length;
    if (remaining <= 0) { setMessage('The 12-photo limit has been reached.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const sources = Array.from(files);
      if (sources.length > remaining) throw new Error('Select up to ' + remaining + ' more photos.');
      const added = [];
      for (const file of sources) added.push(await optimizeMosaicFile(file));
      update({ ...current, photos: [...current.photos, ...added] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to add photos.');
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    if (!recipe) return;
    const other = index + delta;
    if (other < 0 || other >= recipe.photos.length) return;
    const photos = [...recipe.photos];
    [photos[index], photos[other]] = [photos[other], photos[index]];
    update({ ...recipe, photos });
  }

  function remove(index: number) {
    if (!recipe) return;
    const photos = recipe.photos.filter((_, i) => i !== index);
    if (photos.length === 0) {
      flatten();
    } else {
      update({ ...recipe, photos });
    }
  }

  return <section className="setting-card mosaic-card" aria-label="MosaicLab multi-photo studio">
    <div className="section-title"><span>05 / MOSAICLAB</span><Grid2X2 size={18} /></div>
    <strong className="setting-label">One wall. Many stories.</strong>
    <p className="helper-text">Arrange up to 12 photos as a complete printable collage. Change the grid and reorder photos before exporting a PDF.</p>
    <input className="visually-hidden" ref={fileInput} type="file"
      accept="image/png,image/jpeg,image/webp" multiple
      aria-label="Choose MosaicLab photos"
      onChange={e => { const files = e.target.files; void addFiles(files); e.target.value = ''; }} />
    <button type="button" disabled={busy || (recipe?.photos.length ?? 0) >= MAX_MOSAIC_PHOTOS}
      className="outline-button mosaic-add" onClick={() => fileInput.current?.click()}>
      <ImagePlus size={16} /> {busy ? 'IMPORTING PHOTOS...' : 'ADD PHOTOS'}
    </button>

    {recipe && <>
      <div className="mosaic-count">{recipe.photos.length} OF {MAX_MOSAIC_PHOTOS} PHOTO SLOTS <span><Layers3 size={14}/> EDITABLE SOURCE</span></div>
      <div className="mosaic-photos">
        {recipe.photos.map((photo, index) =>
          <div className="mosaic-photo" key={index}>
            <img src={photo.dataUrl} alt={'Mosaic item ' + (index + 1)} />
            <div className="mosaic-photo-meta">
              <strong title={photo.name}>{index + 1}. {photo.name}</strong>
              <div className="mosaic-photo-buttons">
                <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={'Move photo ' + (index + 1) + ' earlier'}><ArrowUp size={14}/></button>
                <button type="button" onClick={() => move(index, 1)} disabled={busy || index === recipe.photos.length - 1} aria-label={'Move photo ' + (index + 1) + ' later'}><ArrowDown size={14}/></button>
                <button type="button" onClick={() => remove(index)} disabled={busy} aria-label={'Remove photo ' + (index + 1)}><Trash2 size={14}/></button>
              </div>
            </div>
          </div>,
        )}
      </div>

      <div className="mosaic-options">
        <label htmlFor="mosaic-columns">COLUMNS</label>
        <select id="mosaic-columns" value={recipe.columns} disabled={busy}
          onChange={e => update({ ...recipe, columns: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map(n => <option value={n} key={n}>{n} column{n === 1 ? '' : 's'}</option>)}
        </select>
        <label htmlFor="mosaic-fit">PHOTO FIT</label>
        <select id="mosaic-fit" value={recipe.fit} disabled={busy}
          onChange={e => update({ ...recipe, fit: e.target.value as MosaicRecipe['fit'] })}>
          <option value="cover">Fill each tile / crop</option>
          <option value="contain">Contain / full photo</option>
        </select>
        <div className="mosaic-gap-label"><label htmlFor="mosaic-gap">TILE SPACING</label><strong>{recipe.gapPercent}%</strong></div>
        <input id="mosaic-gap" type="range" min="0" max="8" step=".5" disabled={busy}
          value={recipe.gapPercent} onChange={e => update({ ...recipe, gapPercent: Number(e.target.value) })} />
        <label htmlFor="mosaic-color">BORDER COLOR</label>
        <input id="mosaic-color" type="color" value={recipe.background} disabled={busy}
          onChange={e => update({ ...recipe, background: e.target.value })} />
      </div>
      <button type="button" className="mosaic-flatten" onClick={flatten} disabled={busy}>
        FLATTEN TO SINGLE IMAGE
      </button>
      <p className="helper-text">Flatten keeps the finished collage in the poster studio but discards editable photo layers. Save a Project Vault backup first.</p>
    </>}
    {message && <p className="vault-message" role="status">{message}</p>}
    <p className="helper-text">Photos are compressed locally. Project Vault preserves their order and collage settings. No photo uploads.</p>
  </section>;
}
