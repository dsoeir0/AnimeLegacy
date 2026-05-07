import { describe, expect, it } from 'vitest';
import {
  coordsForAnime,
  rankByVibe,
  vibeDistance,
  vibeMatch,
} from '../lib/utils/vibeFinder';

const make = (overrides) => ({
  mal_id: 1,
  type: 'TV',
  episodes: 12,
  duration: '24 min per ep',
  genres: [],
  ...overrides,
});

describe('coordsForAnime', () => {
  it('starts at type-based defaults and clamps to [0, 100]', () => {
    const c = coordsForAnime(make({ type: 'TV' }));
    expect(c.pace).toBeGreaterThanOrEqual(0);
    expect(c.pace).toBeLessThanOrEqual(100);
    expect(c.tone).toBeGreaterThanOrEqual(0);
    expect(c.tone).toBeLessThanOrEqual(100);
    expect(c.world).toBeGreaterThanOrEqual(0);
    expect(c.world).toBeLessThanOrEqual(100);
  });

  it('action + horror trends chaotic + bleak', () => {
    const action = coordsForAnime(make({ genres: [{ name: 'Action' }, { name: 'Horror' }] }));
    const serene = coordsForAnime(make({ genres: [{ name: 'Slice of Life' }] }));
    expect(action.pace).toBeGreaterThan(serene.pace);
    expect(action.tone).toBeGreaterThan(serene.tone);
  });

  it('slice of life + comedy trends serene + hopeful', () => {
    const c = coordsForAnime(
      make({ genres: [{ name: 'Slice of Life' }, { name: 'Comedy' }] }),
    );
    expect(c.pace).toBeLessThan(40);
    expect(c.tone).toBeLessThan(30);
  });

  it('fantasy + magic trends fantastical', () => {
    const fantasy = coordsForAnime(
      make({ genres: [{ name: 'Fantasy' }, { name: 'Magic' }] }),
    );
    const grounded = coordsForAnime(make({ genres: [{ name: 'Slice of Life' }] }));
    expect(fantasy.world).toBeGreaterThan(70);
    expect(grounded.world).toBeLessThan(35);
  });

  it('isekai pushes world strongly upward', () => {
    expect(coordsForAnime(make({ genres: [{ name: 'Isekai' }] })).world).toBeGreaterThan(70);
  });

  it('sports + workplace trends grounded', () => {
    const c = coordsForAnime(make({ genres: [{ name: 'Sports' }, { name: 'Workplace' }] }));
    expect(c.world).toBeLessThan(20);
  });

  it('accepts string genre entries', () => {
    expect(coordsForAnime(make({ genres: ['Action'] })).pace).toBeGreaterThan(40);
  });

  it('returns a neutral midpoint for bogus input', () => {
    expect(coordsForAnime(null)).toEqual({ pace: 50, tone: 50, world: 50 });
    expect(coordsForAnime({})).toBeDefined();
  });
});

describe('vibeDistance / vibeMatch', () => {
  it('same coords → distance 0, match 100', () => {
    const a = make({ genres: [{ name: 'Action' }] });
    const target = coordsForAnime(a);
    expect(vibeDistance(a, target)).toBe(0);
    expect(vibeMatch(a, target)).toBe(100);
  });

  it('match is clamped at 60 on the low end', () => {
    const a = make({ genres: [{ name: 'Slice of Life' }, { name: 'Comedy' }] });
    const farTarget = { pace: 100, tone: 100, world: 100 };
    expect(vibeMatch(a, farTarget)).toBeGreaterThanOrEqual(60);
  });
});

describe('rankByVibe', () => {
  const pool = [
    make({ mal_id: 1, genres: [{ name: 'Slice of Life' }] }),
    make({ mal_id: 2, genres: [{ name: 'Action' }, { name: 'Horror' }] }),
    make({ mal_id: 3, genres: [{ name: 'Fantasy' }, { name: 'Magic' }] }),
    make({ mal_id: 4, genres: [{ name: 'Drama' }, { name: 'Psychological' }] }),
  ];

  it('ranks closest first', () => {
    const ranked = rankByVibe(pool, { pace: 10, tone: 10, world: 25 });
    expect(ranked[0].anime.mal_id).toBe(1);
  });

  it('fantastical target favours fantasy + magic', () => {
    const ranked = rankByVibe(pool, { pace: 50, tone: 50, world: 95 });
    expect(ranked[0].anime.mal_id).toBe(3);
  });

  it('respects the limit', () => {
    expect(rankByVibe(pool, { pace: 50, tone: 50, world: 50 }, 2)).toHaveLength(2);
  });

  it('returns empty for non-array pool', () => {
    expect(rankByVibe(null, { pace: 50, tone: 50, world: 50 })).toEqual([]);
  });

  it('carries a match score on every result', () => {
    const ranked = rankByVibe(pool, { pace: 50, tone: 50, world: 50 }, 4);
    for (const r of ranked) {
      expect(r.match).toBeGreaterThanOrEqual(60);
      expect(r.match).toBeLessThanOrEqual(100);
    }
  });
});
