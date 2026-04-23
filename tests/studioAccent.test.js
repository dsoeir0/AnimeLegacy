import { describe, expect, it } from 'vitest';
import { STUDIO_ACCENTS, accentForStudio } from '../lib/utils/studioAccent';

describe('accentForStudio', () => {
  it('rotates deterministically through the palette by mal_id', () => {
    // mal_id 0 is invalid (falsy), so start at 1 — palette[1 % 6] = index 1
    expect(accentForStudio(1)).toBe(STUDIO_ACCENTS[1]);
    expect(accentForStudio(2)).toBe(STUDIO_ACCENTS[2]);
    expect(accentForStudio(5)).toBe(STUDIO_ACCENTS[5]);
    expect(accentForStudio(6)).toBe(STUDIO_ACCENTS[0]); // wraps around
    expect(accentForStudio(7)).toBe(STUDIO_ACCENTS[1]);
  });

  it('returns the same accent across multiple calls for the same id', () => {
    const a = accentForStudio(137);
    const b = accentForStudio(137);
    expect(a).toBe(b);
  });

  it('falls back to the first palette entry for invalid input', () => {
    expect(accentForStudio(0)).toBe(STUDIO_ACCENTS[0]);
    expect(accentForStudio(-1)).toBe(STUDIO_ACCENTS[0]);
    expect(accentForStudio(null)).toBe(STUDIO_ACCENTS[0]);
    expect(accentForStudio(undefined)).toBe(STUDIO_ACCENTS[0]);
    expect(accentForStudio('abc')).toBe(STUDIO_ACCENTS[0]);
  });

  it('each palette entry is a { base, ink } pair of non-empty strings', () => {
    for (const entry of STUDIO_ACCENTS) {
      expect(typeof entry.base).toBe('string');
      expect(entry.base.length).toBeGreaterThan(0);
      expect(typeof entry.ink).toBe('string');
      expect(entry.ink.length).toBeGreaterThan(0);
    }
  });
});
