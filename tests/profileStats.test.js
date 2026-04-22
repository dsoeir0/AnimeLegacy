// Pure unit tests for profile aggregators. Guards the headline numbers on
// the profile page (completed count, hours watched via totalEpisodes, mean
// score) against silent regressions in the reducer logic.

import { describe, expect, it } from 'vitest';
import { computeGenres, computeStats } from '../lib/utils/profileStats';

describe('computeStats', () => {
  it('returns zero stats for empty or non-array input', () => {
    expect(computeStats([])).toEqual({
      watchedCount: 0,
      totalEpisodes: 0,
      daysSpent: 0,
      myAvgScore: null,
      malAvgScore: null,
      reviewCount: 0,
    });
    expect(computeStats(undefined).watchedCount).toBe(0);
    expect(computeStats(null).totalEpisodes).toBe(0);
  });

  it('counts completed shows, excluding still-airing ones flagged completed', () => {
    const items = [
      { status: 'completed', airing: false, progress: 12, episodesTotal: 12 },
      { status: 'completed', airing: true, progress: 11, episodesTotal: 12 }, // airing completed → watching
      { status: 'watching', airing: false, progress: 5 },
      { status: 'dropped', progress: 2 },
    ];
    expect(computeStats(items).watchedCount).toBe(1);
  });

  it('sums episodes using progress where present, falling back to episodesTotal for completed', () => {
    const items = [
      { status: 'completed', progress: 12 },        // 12
      { status: 'completed', episodesTotal: 26 },    // 26 (no progress)
      { status: 'watching', progress: 3 },           // 3
      { status: 'plan' },                            // 0
    ];
    expect(computeStats(items).totalEpisodes).toBe(41);
  });

  it('computes daysSpent at 24 minutes per episode', () => {
    const items = [{ status: 'watching', progress: 60 }];
    // 60 eps × 24 min = 1440 min = 24 h = 1 day
    expect(computeStats(items).daysSpent).toBe(1);
  });

  it('computes mean of user ratings only', () => {
    const items = [
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
      { rating: null },
      { /* no rating field */ },
    ];
    expect(computeStats(items).myAvgScore).toBe(4);
  });

  it('leaves myAvgScore null when no user rating exists', () => {
    expect(computeStats([{ status: 'watching' }]).myAvgScore).toBeNull();
  });

  it('computes mean MAL score independently of user rating', () => {
    const items = [
      { malScore: 9.0 },
      { malScore: 8.0 },
      { malScore: 7.0 },
    ];
    expect(computeStats(items).malAvgScore).toBe(8);
  });

  it('counts only non-empty reviews', () => {
    const items = [
      { review: 'Slow burn that pays off.' },
      { review: '   ' },                 // whitespace only → not counted
      { review: '' },                    // empty → not counted
      { rating: 5 },                     // no review field → not counted
      { review: 'Another take.' },
    ];
    expect(computeStats(items).reviewCount).toBe(2);
  });
});

describe('computeGenres', () => {
  it('returns empty array for empty input', () => {
    expect(computeGenres([])).toEqual([]);
    expect(computeGenres(null)).toEqual([]);
  });

  it('ranks genres by frequency, top 5', () => {
    const items = [
      { genres: ['Adventure', 'Fantasy'] },
      { genres: ['Adventure', 'Drama'] },
      { genres: ['Adventure', 'Sci-Fi'] },
      { genres: ['Fantasy'] },
      { genres: ['Drama', 'Comedy'] },
      { genres: ['Mecha'] },
      { genres: ['Slice of Life'] },
      { genres: ['Horror'] },
    ];
    const top = computeGenres(items);
    expect(top.slice(0, 3)).toEqual(['Adventure', 'Fantasy', 'Drama']);
    expect(top.length).toBeLessThanOrEqual(5);
  });

  it('skips items without a genres array', () => {
    const items = [
      { genres: ['Fantasy'] },
      { genres: 'not-an-array' },
      { /* no genres */ },
      { genres: ['Fantasy'] },
    ];
    expect(computeGenres(items)).toEqual(['Fantasy']);
  });
});
