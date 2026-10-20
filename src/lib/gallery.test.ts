import { describe, expect, it } from 'vitest';
import {
  cleanGalleryText, galleryHeaderHeight, galleryInk, galleryLabelHeight,
  validateGalleryConfig, validateGalleryLink, shortenText,
} from './gallery';

describe('Gallery Composer metadata and geometry', () => {
  it('accepts literal HTTPS QR destinations and rejects unsafe schemes or credentials', () => {
    expect(validateGalleryLink('https://example.org/art?id=2')).toBe('https://example.org/art?id=2');
    expect(validateGalleryLink('')).toBe('');
    expect(() => validateGalleryLink('http://example.org')).toThrow();
    expect(() => validateGalleryLink('javascript:alert(1)')).toThrow();
    expect(() => validateGalleryLink('https://user:pass@example.org')).toThrow();
    expect(() => validateGalleryLink('https://example.org/a b')).toThrow();
  });
  it('keeps complete gallery config and validates fields', () => {
    const g = { enabled: true, title: 'The Stillness That Moves', subtitle: 'An exhibition', showQr: true };
    expect(validateGalleryConfig(g)).toEqual(g);
    expect(() => validateGalleryConfig({ ...g, subtitle: '\nattack' })).toThrow();
    expect(() => cleanGalleryText('x'.repeat(141), 140)).toThrow();
  });
  it('reserves predictable space for exhibition headers and labels', () => {
    expect(galleryHeaderHeight(1000, false)).toBe(0);
    expect(galleryHeaderHeight(1000, true)).toBe(125);
    expect(galleryLabelHeight(400, true)).toBe(100);
    expect(galleryLabelHeight(400, false)).toBe(0);
  });
  it('chooses readable label ink and truncates long titles', () => {
    expect(galleryInk('#ffffff')).toBe('#171e2c');
    expect(galleryInk('#101820')).toBe('#faf8ef');
    const fake = { measureText: (text: string) => ({ width: text.length * 10 }) };
    expect(shortenText(fake, 'Long artwork title', 80)).toContain('…');
    expect(shortenText(fake, 'Short', 80)).toBe('Short');
  });
});
