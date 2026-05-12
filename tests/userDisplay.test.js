import { describe, it, expect } from 'vitest';
import { nameInitials, userInitials } from '../lib/utils/userDisplay.js';

describe('userInitials', () => {
  it('returns the first uppercase letter of the name', () => {
    expect(userInitials('Mirtilito')).toBe('M');
    expect(userInitials('duarte')).toBe('D');
  });

  it('falls back to "U" for empty, null, or undefined input', () => {
    expect(userInitials('')).toBe('U');
    expect(userInitials(null)).toBe('U');
    expect(userInitials(undefined)).toBe('U');
  });

  it('trims leading whitespace before taking the initial', () => {
    expect(userInitials('   Lucas')).toBe('L');
  });

  it('handles unicode initial characters', () => {
    expect(userInitials('Álvaro')).toBe('Á');
  });

  it('coerces numbers to strings', () => {
    expect(userInitials(42)).toBe('4');
  });
});

describe('nameInitials', () => {
  it('returns 2-letter initials for first + last words', () => {
    expect(nameInitials('Aive Reno')).toBe('AR');
    expect(nameInitials('M. Yamazaki')).toBe('MY');
  });

  it('returns first two chars when single-word name', () => {
    expect(nameInitials('Daru')).toBe('DA');
  });

  it('returns ?? for empty input', () => {
    expect(nameInitials('')).toBe('??');
    expect(nameInitials(null)).toBe('??');
    expect(nameInitials('   ')).toBe('??');
  });

  it('respects count=1 to return single letter', () => {
    expect(nameInitials('Aive Reno', 1)).toBe('A');
  });
});
