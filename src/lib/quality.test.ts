import { describe, expect, it } from 'vitest';
import { sourcePixelsPerInch, printQualityBand, qualityDescription } from './quality';

describe('source detail estimate', () => {
  it('reports 100 PPI for a matching image and poster', () => {
    expect(sourcePixelsPerInch(2400, 3600, 24, 36, 'cover')).toBeCloseTo(100);
  });

  it('accounts for image cropping vs letterboxing', () => {
    expect(sourcePixelsPerInch(1000, 1000, 20, 40, 'cover')).toBeCloseTo(25);
    expect(sourcePixelsPerInch(1000, 1000, 20, 40, 'contain')).toBeCloseTo(50);
  });

  it('guards invalid images and dimensions', () => {
    expect(sourcePixelsPerInch(0, 1000, 20, 30, 'cover')).toBe(0);
    expect(sourcePixelsPerInch(1000, 1000, -2, 30, 'cover')).toBe(0);
    expect(sourcePixelsPerInch(Infinity, 1000, 20, 30, 'cover')).toBe(0);
  });

  it('labels quality without claiming to improve source resolution', () => {
    expect(printQualityBand(151)).toBe('good');
    expect(printQualityBand(100)).toBe('fair');
    expect(printQualityBand(74)).toBe('soft');
    expect(qualityDescription(45)).toMatch(/Soft source/);
  });
});
