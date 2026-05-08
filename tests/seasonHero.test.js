import { describe, it, expect } from 'vitest';
import {
  hasScoreSignal,
  isSparseHero,
  pickEditor,
  pickTopThree,
  SPARSE_HERO_THRESHOLD,
} from '../lib/utils/seasonHero.js';

const item = (mal_id, score, popularity) => ({ mal_id, score, popularity });

describe('hasScoreSignal', () => {
  it('returns true when at least one item has a score above zero', () => {
    expect(hasScoreSignal([item(1, 0, 100), item(2, 7.5, 80)])).toBe(true);
  });

  it('returns false when every score is 0 or null', () => {
    expect(hasScoreSignal([item(1, 0, 100), item(2, null, 80)])).toBe(false);
  });

  it('returns false on empty input', () => {
    expect(hasScoreSignal([])).toBe(false);
  });
});

describe('isSparseHero', () => {
  it(`treats <= ${SPARSE_HERO_THRESHOLD} items as sparse`, () => {
    expect(isSparseHero([item(1), item(2), item(3), item(4)])).toBe(true);
    expect(isSparseHero([item(1), item(2), item(3), item(4), item(5)])).toBe(false);
  });
});

describe('pickEditor', () => {
  it('returns null on empty input', () => {
    expect(pickEditor([])).toBeNull();
  });

  it('picks the highest-score item when scores exist', () => {
    const items = [item(1, 7.5, 50), item(2, 9.1, 200), item(3, 8.0, 10)];
    expect(pickEditor(items).mal_id).toBe(2);
  });

  it('falls back to lowest popularity rank when no scores exist', () => {
    const items = [item(1, 0, 500), item(2, null, 100), item(3, 0, 300)];
    expect(pickEditor(items).mal_id).toBe(2);
  });
});

describe('pickTopThree', () => {
  it('excludes the editor pick and returns up to 3 items', () => {
    const items = [
      item(1, 7.5, 50),
      item(2, 9.1, 200),
      item(3, 8.0, 10),
      item(4, 8.5, 20),
      item(5, 6.0, 40),
    ];
    const top = pickTopThree(items, 2);
    expect(top.map((i) => i.mal_id)).toEqual([4, 3, 1]);
  });

  it('falls back to popularity order when no scores exist', () => {
    const items = [
      item(1, 0, 50),
      item(2, 0, 10),
      item(3, 0, 30),
      item(4, 0, 20),
    ];
    const top = pickTopThree(items, 2);
    expect(top.map((i) => i.mal_id)).toEqual([4, 3, 1]);
  });

  it('returns empty array when input is empty', () => {
    expect(pickTopThree([], 1)).toEqual([]);
  });
});
