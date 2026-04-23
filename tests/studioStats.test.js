import { describe, expect, it } from 'vitest';
import {
  avgScore,
  countAiring,
  groupByYear,
  scoreHighlights,
  scoreHistogram,
  topGenres,
  upcomingAnime,
} from '../lib/utils/studioStats';

const make = (overrides) => ({ mal_id: 1, score: 7, ...overrides });

describe('avgScore', () => {
  it('averages numeric scores, ignores missing', () => {
    expect(avgScore([make({ score: 8 }), make({ score: 9 }), make({ score: null })])).toBe(8.5);
  });
  it('returns null for empty / non-array', () => {
    expect(avgScore([])).toBeNull();
    expect(avgScore(null)).toBeNull();
    expect(avgScore([make({ score: null })])).toBeNull();
  });
});

describe('countAiring', () => {
  it('counts airing:true', () => {
    expect(countAiring([make({ airing: true }), make({ airing: false })])).toBe(1);
  });
  it('also counts "Currently Airing" status', () => {
    expect(
      countAiring([
        make({ airing: false, status: 'Currently Airing' }),
        make({ airing: false, status: 'Finished Airing' }),
      ]),
    ).toBe(1);
  });
  it('handles non-array', () => {
    expect(countAiring(null)).toBe(0);
  });
});

describe('upcomingAnime', () => {
  it('filters to Not yet aired', () => {
    const list = [
      make({ mal_id: 1, status: 'Not yet aired' }),
      make({ mal_id: 2, status: 'Currently Airing' }),
      make({ mal_id: 3, status: 'Finished Airing' }),
    ];
    expect(upcomingAnime(list).map((a) => a.mal_id)).toEqual([1]);
  });
});

describe('scoreHistogram', () => {
  it('buckets scores into 10 slots', () => {
    const list = [
      make({ score: 7.2 }), // bucket 7
      make({ score: 7.8 }), // bucket 7
      make({ score: 9.1 }), // bucket 9
      make({ score: 10 }),  // clamped to 9
      make({ score: 0.5 }), // bucket 0
    ];
    const h = scoreHistogram(list);
    expect(h[0]).toBe(1);
    expect(h[7]).toBe(2);
    expect(h[9]).toBe(2);
    expect(h.reduce((s, v) => s + v, 0)).toBe(5);
  });
  it('handles empty/null safely', () => {
    expect(scoreHistogram(null)).toEqual(Array(10).fill(0));
    expect(scoreHistogram([]).length).toBe(10);
  });
});

describe('scoreHighlights', () => {
  it('computes median / percent above 8 / best', () => {
    const list = [
      make({ score: 6 }),
      make({ score: 7 }),
      make({ score: 8 }),
      make({ score: 9 }),
      make({ score: 10 }),
    ];
    const h = scoreHighlights(list);
    expect(h.median).toBe(8);
    expect(h.percentAbove8).toBe(60);
    expect(h.best).toBe(10);
  });
  it('medians with even length average the two middles', () => {
    const list = [
      make({ score: 6 }),
      make({ score: 7 }),
      make({ score: 8 }),
      make({ score: 9 }),
    ];
    expect(scoreHighlights(list).median).toBe(7.5);
  });
  it('returns all nulls when nothing scored', () => {
    expect(scoreHighlights([make({ score: null })])).toEqual({
      median: null,
      percentAbove8: null,
      best: null,
    });
  });
});

describe('topGenres', () => {
  it('ranks genres by frequency', () => {
    const list = [
      make({ genres: [{ name: 'Action' }, { name: 'Drama' }] }),
      make({ genres: [{ name: 'Action' }, { name: 'Comedy' }] }),
      make({ genres: [{ name: 'Action' }] }),
    ];
    const top = topGenres(list, 3);
    expect(top.map((g) => g.name)).toEqual(['Action', 'Drama', 'Comedy']);
    expect(top[0].count).toBe(3);
  });

  it('tie-breaks by first appearance in input', () => {
    const list = [
      make({ genres: [{ name: 'Drama' }] }),
      make({ genres: [{ name: 'Action' }] }),
    ];
    const top = topGenres(list, 2);
    // Both 1 count — Drama came first
    expect(top[0].name).toBe('Drama');
    expect(top[1].name).toBe('Action');
  });

  it('accepts string genre entries', () => {
    const list = [make({ genres: ['Action', null, 'Drama'] })];
    expect(topGenres(list).map((g) => g.name)).toEqual(['Action', 'Drama']);
  });

  it('limit caps the output length', () => {
    const list = [
      make({ genres: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] }),
    ];
    expect(topGenres(list, 2)).toHaveLength(2);
  });
});

describe('groupByYear', () => {
  it('groups by year descending, null bucket last', () => {
    const list = [
      make({ mal_id: 1, year: 2020 }),
      make({ mal_id: 2, year: 2024 }),
      make({ mal_id: 3, year: 2020 }),
      make({ mal_id: 4, year: null }),
    ];
    const groups = groupByYear(list);
    expect(groups[0]).toMatchObject({ year: 2024 });
    expect(groups[1]).toMatchObject({ year: 2020 });
    expect(groups[1].anime).toHaveLength(2);
    expect(groups[2].year).toBeNull();
  });

  it('falls back to aired.prop.from.year when year is missing', () => {
    const list = [
      make({ year: null, aired: { prop: { from: { year: 2019 } } } }),
    ];
    expect(groupByYear(list)[0].year).toBe(2019);
  });
});
