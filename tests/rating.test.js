import { describe, expect, it } from 'vitest';
import { formatFivePoint, toFivePoint } from '../lib/utils/rating';

describe('toFivePoint', () => {
  it('halves the MAL 1-10 value into the 0-5 range', () => {
    expect(toFivePoint(8.5)).toBe(4.25);
    expect(toFivePoint(10)).toBe(5);
    expect(toFivePoint(1)).toBe(0.5);
  });

  it('returns null for non-numeric or non-positive input', () => {
    expect(toFivePoint(null)).toBe(null);
    expect(toFivePoint(undefined)).toBe(null);
    expect(toFivePoint(0)).toBe(null);
    expect(toFivePoint(NaN)).toBe(null);
    expect(toFivePoint('8.5')).toBe(null);
  });
});

describe('formatFivePoint', () => {
  it('formats the converted score to the requested precision', () => {
    expect(formatFivePoint(8.5)).toBe('4.3');
    expect(formatFivePoint(8.5, 2)).toBe('4.25');
    expect(formatFivePoint(10, 1)).toBe('5.0');
  });

  it('returns null when the source value is unusable', () => {
    expect(formatFivePoint(null)).toBe(null);
    expect(formatFivePoint(0)).toBe(null);
  });
});
