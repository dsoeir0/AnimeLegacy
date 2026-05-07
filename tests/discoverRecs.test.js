import { describe, expect, it } from 'vitest';
import {
  candidatePool,
  fallbackByGenre,
  pickRandomAnchor,
  pickUniqueBanners,
  truncateTitleList,
} from '../lib/utils/discoverRecs';

const seq = (xs) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe('candidatePool', () => {
  it('returns watching items when any exist', () => {
    const list = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'watching' },
      { id: 3, status: 'plan' },
    ];
    expect(candidatePool(list).map((e) => e.id)).toEqual([2]);
  });

  it('falls back to whole list when no watching items', () => {
    const list = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'plan' },
    ];
    expect(candidatePool(list).map((e) => e.id)).toEqual([1, 2]);
  });

  it('returns [] for empty / non-array input', () => {
    expect(candidatePool([])).toEqual([]);
    expect(candidatePool(null)).toEqual([]);
    expect(candidatePool(undefined)).toEqual([]);
  });
});

describe('pickRandomAnchor', () => {
  const pool = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it('picks deterministically with seeded RNG', () => {
    expect(pickRandomAnchor(pool, null, () => 0).id).toBe(1);
    expect(pickRandomAnchor(pool, null, () => 0.999).id).toBe(3);
  });

  it('excludes the given id when other candidates exist', () => {
    const seqRng = seq([0]);
    expect(pickRandomAnchor(pool, 1, seqRng).id).toBe(2);
  });

  it('falls back to full pool when exclude is the only item', () => {
    expect(pickRandomAnchor([{ id: 1 }], 1, () => 0).id).toBe(1);
  });

  it('returns null for empty pool', () => {
    expect(pickRandomAnchor([], null, () => 0)).toBeNull();
    expect(pickRandomAnchor(null, null, () => 0)).toBeNull();
  });

  it('coerces id types when comparing exclude', () => {
    const out = pickRandomAnchor([{ id: 1 }, { id: 2 }], '1', () => 0);
    expect(out.id).toBe(2);
  });
});

describe('fallbackByGenre', () => {
  const pool = [
    { mal_id: 10, genres: [{ name: 'Drama' }] },
    { mal_id: 11, genres: [{ name: 'Comedy' }] },
    { mal_id: 12, genres: ['Drama', 'Romance'] },
    { mal_id: 13, genres: [] },
  ];

  it('keeps items that share at least one genre with the anchor', () => {
    const anchor = { id: 1, genres: ['Drama'] };
    const out = fallbackByGenre(anchor, pool, new Set());
    expect(out.map((a) => a.mal_id).sort()).toEqual([10, 12]);
  });

  it('respects blockedIds (Set or Array form)', () => {
    const anchor = { id: 1, genres: ['Drama'] };
    expect(fallbackByGenre(anchor, pool, new Set([10])).map((a) => a.mal_id)).toEqual([12]);
    expect(fallbackByGenre(anchor, pool, [10, 12]).map((a) => a.mal_id)).toEqual([]);
  });

  it('returns [] when anchor has no usable genres', () => {
    expect(fallbackByGenre({ id: 1, genres: [] }, pool, new Set())).toEqual([]);
    expect(fallbackByGenre(null, pool, new Set())).toEqual([]);
  });

  it('handles object-style and string-style genre entries equivalently', () => {
    const anchor = { id: 1, genres: [{ name: 'Drama' }] };
    const out = fallbackByGenre(anchor, pool, new Set());
    expect(out.find((a) => a.mal_id === 12)).toBeTruthy();
  });
});

describe('pickUniqueBanners', () => {
  it('gives each mood the first poster not yet claimed', () => {
    const moods = [{ id: 'a' }, { id: 'b' }];
    const postersByMood = {
      a: [{ mal_id: 1 }, { mal_id: 2 }],
      b: [{ mal_id: 1 }, { mal_id: 3 }],
    };
    const out = pickUniqueBanners(moods, postersByMood);
    expect(out.a.mal_id).toBe(1);
    expect(out.b.mal_id).toBe(3);
  });

  it('falls back to the first poster when all are claimed', () => {
    const moods = [{ id: 'a' }, { id: 'b' }];
    const postersByMood = {
      a: [{ mal_id: 1 }],
      b: [{ mal_id: 1 }],
    };
    const out = pickUniqueBanners(moods, postersByMood);
    expect(out.a.mal_id).toBe(1);
    expect(out.b.mal_id).toBe(1);
  });

  it('returns null for moods without posters', () => {
    const out = pickUniqueBanners([{ id: 'a' }, { id: 'b' }], { a: [] });
    expect(out.a).toBeNull();
    expect(out.b).toBeNull();
  });

  it('skips poster entries without mal_id', () => {
    const moods = [{ id: 'a' }];
    const postersByMood = { a: [{ title: 'X' }, { mal_id: 5 }] };
    expect(pickUniqueBanners(moods, postersByMood).a.mal_id).toBe(5);
  });
});

describe('truncateTitleList', () => {
  it('joins titles with comma + space', () => {
    expect(truncateTitleList([{ title: 'A' }, { title: 'B' }])).toBe('A, B');
  });

  it('truncates titles longer than the cap and appends an ellipsis', () => {
    const out = truncateTitleList([{ title: 'abcdefghijklmnopqrstuvwxyz' }], 10);
    expect(out).toBe('abcdefghij…');
  });

  it('skips entries without a title', () => {
    expect(truncateTitleList([{}, { title: 'X' }, null])).toBe('X');
  });

  it('returns "" for non-array input', () => {
    expect(truncateTitleList(null)).toBe('');
    expect(truncateTitleList(undefined)).toBe('');
  });
});
