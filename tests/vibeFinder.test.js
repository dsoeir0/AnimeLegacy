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
    expect(c.length).toBeGreaterThanOrEqual(0);
    expect(c.length).toBeLessThanOrEqual(100);
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

  it('length increases with episode count', () => {
    const short = coordsForAnime(make({ episodes: 12 }));
    const long = coordsForAnime(make({ episodes: 100 }));
    expect(long.length).toBeGreaterThan(short.length);
  });

  it('movies use duration instead of episode count', () => {
    const shortFilm = coordsForAnime(make({ type: 'Movie', duration: '1 hr 30 min' }));
    const longFilm = coordsForAnime(make({ type: 'Movie', duration: '3 hr 10 min' }));
    expect(longFilm.length).toBeGreaterThan(shortFilm.length);
  });

  it('accepts string genre entries', () => {
    expect(coordsForAnime(make({ genres: ['Action'] })).pace).toBeGreaterThan(40);
  });

  it('returns a neutral midpoint for bogus input', () => {
    expect(coordsForAnime(null)).toEqual({ pace: 50, tone: 50, length: 50 });
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
    const farTarget = { pace: 100, tone: 100, length: 100 };
    expect(vibeMatch(a, farTarget)).toBeGreaterThanOrEqual(60);
  });
});

describe('rankByVibe', () => {
  const pool = [
    make({ mal_id: 1, genres: [{ name: 'Slice of Life' }] }),       // serene
    make({ mal_id: 2, genres: [{ name: 'Action' }, { name: 'Horror' }] }), // chaotic + bleak
    make({ mal_id: 3, genres: [{ name: 'Comedy' }, { name: 'Romance' }] }),// hopeful
    make({ mal_id: 4, genres: [{ name: 'Drama' }, { name: 'Psychological' }] }), // bleak
  ];

  it('ranks closest first', () => {
    const ranked = rankByVibe(pool, { pace: 10, tone: 10, length: 30 });
    expect(ranked[0].anime.mal_id).toBe(1); // slice of life wins for serene/hopeful/short
  });

  it('respects the limit', () => {
    expect(rankByVibe(pool, { pace: 50, tone: 50, length: 50 }, 2)).toHaveLength(2);
  });

  it('returns empty for non-array pool', () => {
    expect(rankByVibe(null, { pace: 50, tone: 50, length: 50 })).toEqual([]);
  });

  it('carries a match score on every result', () => {
    const ranked = rankByVibe(pool, { pace: 50, tone: 50, length: 50 }, 4);
    for (const r of ranked) {
      expect(r.match).toBeGreaterThanOrEqual(60);
      expect(r.match).toBeLessThanOrEqual(100);
    }
  });
});
