import { describe, expect, it } from 'vitest';
import { mergeReorderedSlice } from '../lib/utils/reorder';

describe('mergeReorderedSlice', () => {
  it('places the reordered slice in front and keeps the rest in original order', () => {
    expect(mergeReorderedSlice(['a', 'b', 'c', 'd', 'e'], ['c', 'a'])).toEqual([
      'c',
      'a',
      'b',
      'd',
      'e',
    ]);
  });

  it('drops slice ids that are not in the full list', () => {
    expect(mergeReorderedSlice(['a', 'b'], ['z', 'a'])).toEqual(['a', 'b']);
  });

  it('returns the full list unchanged when slice is empty', () => {
    expect(mergeReorderedSlice(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  it('handles reorder of the entire list', () => {
    expect(mergeReorderedSlice(['a', 'b', 'c'], ['c', 'b', 'a'])).toEqual(['c', 'b', 'a']);
  });
});
