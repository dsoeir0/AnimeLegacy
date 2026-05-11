import { describe, it, expect } from 'vitest';
import { chunk } from '../lib/utils/chunk.js';

describe('chunk', () => {
  it('splits an array into evenly-sized chunks', () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it('puts the remainder in a final smaller chunk', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns one chunk when size is larger than the array', () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it('returns empty for empty input', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('returns empty for non-array input', () => {
    expect(chunk(null, 3)).toEqual([]);
    expect(chunk(undefined, 3)).toEqual([]);
  });

  it('returns empty when size is zero or negative', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([]);
    expect(chunk([1, 2, 3], -1)).toEqual([]);
  });
});
