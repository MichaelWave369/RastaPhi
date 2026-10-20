import { useState } from 'react';
import { Images, QrCode, Type, ExternalLink } from 'lucide-react';
import { type MosaicRecipe, validateMosaic } from './lib/mosaic';
import { validateGalleryLink } from './lib/gallery';

interface Props {
  recipe: MosaicRecipe | null;
  onChange: (recipe: MosaicRecipe | null) => void;
  posterWidth: number;
  posterHeight: number;
}

const defaultGallery = {
  enabled: false, title: 'THE GALLERY', subtitle: 'An exhibition of original work', showQr: true,
};

export default function GalleryComposer({ recipe, onChange, posterWidth, posterHeight }: Props) {
  const [message, setMessage] = useState('');
  const g = recipe?.gallery ?? defaultGallery;

  function update(next: MosaicRecipe) {
    try {
      onChange(validateMosaic(next));
      setMessage('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Invalid gallery settings.');
    }
  }

  function changePhoto(index: number, key: 'title' | 'artist' | 'url', value: string) {
    if (!recipe) return;
    try {
      if (key === 'url') validateGalleryLink(value);
      const photos = recipe.photos.map((p, i) => i === index ? { ...p, [key]: value } : p);
      update({ ...recipe, photos });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Invalid artwork label.');
    }
  }

  const columns = Math.min(recipe?.columns ?? 1, recipe?.photos.length ?? 1);
  const rows = Math.ceil((recipe?.photos.length ?? 1) / columns);
  const headerH = posterHeight * .125;
  const cellHeight = (posterHeight - headerH) / rows;
  const qrSizeIn = Math.min(cellHeight * .25 * .78, posterWidth / columns * .25);

  return <section className="setting-card gallery-card" aria-label="Gallery Composer">
    <div className="section-title"><span>06 / GALLERY COMPOSER</span><Images size={18}/></div>
    <strong className="setting-label">Curate a whole exhibition.</strong>
    <p className="helper-text">Give each piece a title, artist credit, and optional QR link. Your wall prints as a unified exhibition.</p>
    {!recipe ? <div className="vault-empty"><Images size={19}/><span>Add photos in MosaicLab first, then switch Gallery Composer on.</span></div> : <>
      <label className="gallery-toggle">
        <input type="checkbox" checked={g.enabled}
          onChange={e => update({ ...recipe, gallery: { ...g, enabled: e.target.checked } })}/>
        <span>ENABLE GALLERY LAYOUT</span>
      </label>
      <div className="gallery-fields">
        <label htmlFor="gallery-title"><Type size={13}/> EXHIBITION TITLE</label>
        <input id="gallery-title" maxLength={90} value={g.title}
          onChange={e => update({ ...recipe, gallery: { ...g, title: e.target.value } })}/>
        <label htmlFor="gallery-subtitle">EXHIBITION SUBTITLE</label>
        <input id="gallery-subtitle" maxLength={140} value={g.subtitle}
          onChange={e => update({ ...recipe, gallery: { ...g, subtitle: e.target.value } })}/>
        <label className="gallery-toggle gallery-toggle-qr">
          <input type="checkbox" checked={g.showQr}
            onChange={e => update({ ...recipe, gallery: { ...g, showQr: e.target.checked } })}/>
          <QrCode size={16}/> INCLUDE QR LINKS ON LABELS
        </label>
      </div>
      <div className="gallery-works-title">ARTWORK LABELS <span>{recipe.photos.length} pieces</span></div>
      <div className="gallery-works">
        {recipe.photos.map((photo, i) => <div className="gallery-work" key={photo.name + '-' + i}>
          <div className="gallery-work-heading">
            <span>{String(i + 1).padStart(2, '0')}</span>
            <strong title={photo.name}>{photo.name}</strong>
          </div>
          <label htmlFor={'art-title-' + i}>ARTWORK TITLE</label>
          <input id={'art-title-' + i} maxLength={90} value={photo.title ?? ''}
            placeholder="Title on printed label"
            onChange={e => changePhoto(i, 'title', e.target.value)}/>
          <label htmlFor={'art-artist-' + i}>ARTIST / CREDIT</label>
          <input id={'art-artist-' + i} maxLength={80} value={photo.artist ?? ''}
            placeholder="Artist or creator"
            onChange={e => changePhoto(i, 'artist', e.target.value)}/>
          <label htmlFor={'art-url-' + i}><ExternalLink size={12}/> QR DESTINATION (HTTPS)</label>
          <input id={'art-url-' + i} key={'url-' + photo.name + '-' + i}
            type="url" defaultValue={photo.url ?? ''} placeholder="https://example.com/art"
            onBlur={e => changePhoto(i, 'url', e.target.value.trim())}/>
        </div>)}
      </div>
      <p className="gallery-advisory">{g.showQr && qrSizeIn < .95
        ? 'QR warning: these panels are too small for a roughly 1-inch QR code. Enlarge the poster or reduce columns and rows; small QR codes will be omitted.'
        : 'QR codes are generated locally. Print at 100% and test every code with a real phone before mounting the wall.'}</p>
      <p className="helper-text">For the safest public exhibit, check each link before sharing. Gallery mode is raster artwork, and all editables are kept in Project Vault.</p>
    </>}
    {message && <p className="vault-message" role="status">{message}</p>}
  </section>;
}
