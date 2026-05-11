import { describe, it, expect } from 'vitest';
import {
  SEASON_KEYS,
  formatSeasonLabel,
  getSeasonFromDate,
} from '../lib/utils/season.js';

describe('getSeasonFromDate', () => {
  it('returns winter for Jan / Feb / Mar', () => {
    expect(getSeasonFromDate(new Date(2026, 0, 15))).toBe('winter');
    expect(getSeasonFromDate(new Date(2026, 1, 15))).toBe('winter');
    expect(getSeasonFromDate(new Date(2026, 2, 31))).toBe('winter');
  });

  it('returns spring for Apr / May / Jun', () => {
    expect(getSeasonFromDate(new Date(2026, 3, 1))).toBe('spring');
    expect(getSeasonFromDate(new Date(2026, 4, 15))).toBe('spring');
    expect(getSeasonFromDate(new Date(2026, 5, 30))).toBe('spring');
  });

  it('returns summer for Jul / Aug / Sep', () => {
    expect(getSeasonFromDate(new Date(2026, 6, 1))).toBe('summer');
    expect(getSeasonFromDate(new Date(2026, 7, 15))).toBe('summer');
    expect(getSeasonFromDate(new Date(2026, 8, 30))).toBe('summer');
  });

  it('returns fall for Oct / Nov / Dec', () => {
    expect(getSeasonFromDate(new Date(2026, 9, 1))).toBe('fall');
    expect(getSeasonFromDate(new Date(2026, 10, 15))).toBe('fall');
    expect(getSeasonFromDate(new Date(2026, 11, 31))).toBe('fall');
  });

  it('defaults to today when no date is given', () => {
    const result = getSeasonFromDate();
    expect(SEASON_KEYS).toContain(result);
  });
});

describe('formatSeasonLabel', () => {
  it('combines a capitalized season with the year', () => {
    expect(formatSeasonLabel('spring', 2026)).toBe('Spring 2026');
  });

  it('returns just the season label when year is missing', () => {
    expect(formatSeasonLabel('winter')).toBe('Winter');
  });

  it('returns just the year when season is missing', () => {
    expect(formatSeasonLabel(null, 2026)).toBe('2026');
    expect(formatSeasonLabel('', 2026)).toBe('2026');
  });

  it('returns Unknown when both are missing', () => {
    expect(formatSeasonLabel()).toBe('Unknown');
    expect(formatSeasonLabel(null, null)).toBe('Unknown');
  });
});

describe('SEASON_KEYS', () => {
  it('exposes the four canonical season keys in calendar order', () => {
    expect(SEASON_KEYS).toEqual(['winter', 'spring', 'summer', 'fall']);
  });
});
