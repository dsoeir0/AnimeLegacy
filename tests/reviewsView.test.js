import { describe, expect, it } from 'vitest';
import {
  collectReviewYears,
  computeReviewsStats,
  filterReviewsByText,
  filterReviewsByYear,
  groupReviewsBySentiment,
  sortReviews,
} from '../lib/utils/reviewsView';

const r = (overrides = {}) => ({
  animeId: '1',
  title: 'Sample',
  rating: 4,
  review: 'A nice show',
  updatedAt: '2026-01-01',
  ...overrides,
});

describe('groupReviewsBySentiment', () => {
  it('places 4.5+ into loved, 3.5-4.4 into liked, 2.5-3.4 into mixed, <2.5 into disliked', () => {
    const groups = groupReviewsBySentiment([
      r({ rating: 5 }),
      r({ rating: 4.5 }),
      r({ rating: 4 }),
      r({ rating: 3 }),
      r({ rating: 2 }),
    ]);
    expect(groups.loved.length).toBe(2);
    expect(groups.liked.length).toBe(1);
    expect(groups.mixed.length).toBe(1);
    expect(groups.disliked.length).toBe(1);
  });

  it('places entries without a numeric rating into the unrated bucket', () => {
    const groups = groupReviewsBySentiment([r({ rating: null }), r({ rating: undefined })]);
    expect(groups.unrated.length).toBe(2);
    expect(groups.loved.length).toBe(0);
    expect(groups.liked.length).toBe(0);
    expect(groups.mixed.length).toBe(0);
    expect(groups.disliked.length).toBe(0);
  });
});

describe('sortReviews', () => {
  it('sorts newest by updatedAt desc', () => {
    const list = [
      r({ animeId: 'a', updatedAt: '2026-01-01' }),
      r({ animeId: 'b', updatedAt: '2026-05-01' }),
    ];
    expect(sortReviews(list, 'newest')[0].animeId).toBe('b');
  });

  it('sorts highest by rating desc, lowest by rating asc', () => {
    const list = [r({ rating: 2 }), r({ rating: 5 }), r({ rating: 3 })];
    expect(sortReviews(list, 'highest').map((e) => e.rating)).toEqual([5, 3, 2]);
    expect(sortReviews(list, 'lowest').map((e) => e.rating)).toEqual([2, 3, 5]);
  });

  it('sorts longest by review word count desc', () => {
    const list = [r({ review: 'a b' }), r({ review: 'a b c d e' }), r({ review: 'x' })];
    expect(sortReviews(list, 'longest')[0].review).toBe('a b c d e');
  });
});

describe('filterReviewsByText', () => {
  it('matches on title or review text, case-insensitive', () => {
    const list = [r({ title: 'Naruto' }), r({ title: 'Bleach', review: 'great show' })];
    expect(filterReviewsByText(list, 'naru').length).toBe(1);
    expect(filterReviewsByText(list, 'great').length).toBe(1);
    expect(filterReviewsByText(list, '').length).toBe(2);
  });
});

describe('filterReviewsByYear', () => {
  it('keeps only entries with updatedAt year matching', () => {
    const list = [r({ updatedAt: '2026-01-01' }), r({ updatedAt: '2025-06-01' })];
    expect(filterReviewsByYear(list, 2026).length).toBe(1);
    expect(filterReviewsByYear(list, 'all').length).toBe(2);
  });
});

describe('collectReviewYears', () => {
  it('returns unique years sorted desc', () => {
    const list = [
      r({ updatedAt: '2024-01-01' }),
      r({ updatedAt: '2026-01-01' }),
      r({ updatedAt: '2025-01-01' }),
      r({ updatedAt: '2026-05-01' }),
    ];
    expect(collectReviewYears(list)).toEqual([2026, 2025, 2024]);
  });
});

describe('computeReviewsStats', () => {
  it('counts total, totalWords, avgWords, and mean rating', () => {
    const list = [
      r({ rating: 4, review: 'one two three' }),
      r({ rating: 5, review: 'a b' }),
      r({ rating: null, review: '' }),
    ];
    const stats = computeReviewsStats(list);
    expect(stats.total).toBe(3);
    expect(stats.totalWords).toBe(5);
    expect(stats.avgWords).toBe(3);
    expect(stats.mean).toBe(4.5);
  });
});
