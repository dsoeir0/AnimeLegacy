import { describe, expect, it } from 'vitest';
import {
  DISCOVER_MOODS,
  VISIBLE_MOODS,
  fisherYatesPick,
} from '../components/discover/moods';

const constantRng = (value) => () => value;

describe('DISCOVER_MOODS catalog', () => {
  it('every mood has id, labelKey, subKey, accent, query', () => {
    for (const mood of DISCOVER_MOODS) {
      expect(typeof mood.id).toBe('string');
      expect(typeof mood.labelKey).toBe('string');
      expect(typeof mood.subKey).toBe('string');
      expect(typeof mood.accent).toBe('string');
      expect(typeof mood.query).toBe('string');
      expect(mood.query).toMatch(/genres=\d/);
    }
  });

  it('mood ids are unique', () => {
    const ids = DISCOVER_MOODS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('catalog has at least the visible-window count', () => {
    expect(DISCOVER_MOODS.length).toBeGreaterThanOrEqual(VISIBLE_MOODS);
  });
});

describe('fisherYatesPick', () => {
  it('returns exactly N items', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(fisherYatesPick(arr, 3, constantRng(0)).length).toBe(3);
    expect(fisherYatesPick(arr, 8, constantRng(0)).length).toBe(8);
  });

  it('does not mutate the input array', () => {
    const arr = [1, 2, 3, 4, 5];
    const snapshot = [...arr];
    fisherYatesPick(arr, 3);
    expect(arr).toEqual(snapshot);
  });

  it('is deterministic given a seeded RNG', () => {
    const arr = [1, 2, 3, 4, 5];
    const a = fisherYatesPick(arr, 3, constantRng(0));
    const b = fisherYatesPick(arr, 3, constantRng(0));
    expect(a).toEqual(b);
  });

  it('returns all elements when N >= input length', () => {
    expect(fisherYatesPick([1, 2, 3], 5, constantRng(0)).sort()).toEqual([1, 2, 3]);
  });
});
