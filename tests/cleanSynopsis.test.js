// Pure unit tests for the synopsis sanitizer. No emulator, no Firestore —
// just verifies the regex covers MAL's real-world credit tag formats.

import { describe, expect, it } from 'vitest';
import { cleanSynopsis } from '../lib/utils/synopsis';

describe('cleanSynopsis', () => {
  it('returns empty string for falsy / non-string input', () => {
    expect(cleanSynopsis(null)).toBe('');
    expect(cleanSynopsis(undefined)).toBe('');
    expect(cleanSynopsis('')).toBe('');
    expect(cleanSynopsis(123)).toBe('');
    expect(cleanSynopsis({})).toBe('');
  });

  it('passes through clean text untouched (other than trim)', () => {
    expect(cleanSynopsis('A cartographer rides east.')).toBe(
      'A cartographer rides east.',
    );
    expect(cleanSynopsis('  with padding\n')).toBe('with padding');
  });

  it('strips trailing [Written by MAL Rewrite]', () => {
    expect(cleanSynopsis('The plot thickens. [Written by MAL Rewrite]')).toBe(
      'The plot thickens.',
    );
  });

  it('strips (Source: ANN)', () => {
    expect(cleanSynopsis('A quiet tale. (Source: ANN)')).toBe('A quiet tale.');
  });

  it('strips the Source/Written-by tag even when it contains commas and colons', () => {
    expect(cleanSynopsis('Mecha action. (Source: MAL Rewrite, edited)')).toBe(
      'Mecha action.',
    );
  });

  it('strips multiple trailing tags', () => {
    expect(
      cleanSynopsis('A story. (Source: MAL) [Written by Funimation]'),
    ).toBe('A story.');
  });

  it('strips a tag that appears mid-text', () => {
    expect(
      cleanSynopsis('[Written by Funimation] An opener. Then more plot.'),
    ).toBe('An opener. Then more plot.');
  });

  it('leaves unrelated parenthetical content alone', () => {
    expect(
      cleanSynopsis(
        'Set in the 22nd century (after the fall). Nothing else to see here.',
      ),
    ).toBe('Set in the 22nd century (after the fall). Nothing else to see here.');
  });

  it('leaves unrelated bracketed content alone', () => {
    expect(
      cleanSynopsis('The protagonist [seen here in silhouette] remembers.'),
    ).toBe('The protagonist [seen here in silhouette] remembers.');
  });

  it('normalises trailing whitespace left after stripping', () => {
    expect(cleanSynopsis('Line one.\n\n\n\n[Written by MAL]')).toBe('Line one.');
    expect(cleanSynopsis('Line one.   \nLine two.   \n')).toBe(
      'Line one.\nLine two.',
    );
  });

  it('collapses three-or-more newlines to exactly two', () => {
    expect(cleanSynopsis('Para one.\n\n\n\nPara two.')).toBe(
      'Para one.\n\nPara two.',
    );
  });

  it('is case-insensitive on the credit keywords', () => {
    expect(cleanSynopsis('Plot. [WRITTEN BY SomeoneElse]')).toBe('Plot.');
    expect(cleanSynopsis('Plot. (source: mal)')).toBe('Plot.');
  });
});
