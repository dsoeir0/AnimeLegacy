import { describe, expect, it } from 'vitest';
import { firstSentence, truncateText } from '../lib/utils/text';

describe('truncateText', () => {
  it('returns empty string for non-string input', () => {
    expect(truncateText(null)).toBe('');
    expect(truncateText(undefined)).toBe('');
    expect(truncateText(123)).toBe('');
  });

  it('keeps short strings unchanged', () => {
    expect(truncateText('short text', 50)).toBe('short text');
  });

  it('truncates with ellipsis at word boundary when possible', () => {
    const input = 'The quick brown fox jumps over the lazy dog very far';
    const out = truncateText(input, 30);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out.split(' ').slice(-1)[0]).not.toBe('…');
  });

  it('cuts at hard limit when no space within half-window', () => {
    const input = 'verylongunbrokenwordwithoutspacesthatkeepsgoing';
    const out = truncateText(input, 20);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(21);
  });

  it('collapses whitespace and joins newlines', () => {
    const input = 'line one\nline two\n\nline three';
    const out = truncateText(input, 100);
    expect(out).toBe('line one line two line three');
  });

  it('filters source-credit lines (parens prefix)', () => {
    const input = 'Real bio sentence.\n(Source: MAL)';
    const out = truncateText(input, 100);
    expect(out).toBe('Real bio sentence.');
  });
});

describe('firstSentence', () => {
  it('returns first sentence up to ./!/?', () => {
    expect(firstSentence('Hello world. This is two.')).toBe('Hello world.');
    expect(firstSentence('Wow! That happened.')).toBe('Wow!');
    expect(firstSentence('Is it? Yes.')).toBe('Is it?');
  });

  it('falls back to 90-char slice when no terminator', () => {
    const input = 'no terminator here just a long string of words and more';
    expect(firstSentence(input)).toBe(input.slice(0, 90));
  });

  it('returns empty for falsy/non-string', () => {
    expect(firstSentence('')).toBe('');
    expect(firstSentence(null)).toBe('');
    expect(firstSentence(undefined)).toBe('');
  });
});
