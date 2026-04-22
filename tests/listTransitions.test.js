// Pure tests for the state-machine pieces lifted out of useMyList.
// These cover the corruption-prone corners: progress overflow, favourite
// limit enforcement, status normalisation for airing shows, and every
// branch of activity-label derivation.

import { describe, expect, it } from 'vitest';
import { FAVORITE_LIMIT } from '../lib/constants';
import {
  clampProgress,
  deriveActivityLabel,
  resolveFavorite,
  resolveStatus,
} from '../lib/utils/listTransitions';

describe('resolveStatus', () => {
  it('defaults to plan when no status is given', () => {
    expect(resolveStatus(undefined, false)).toBe('plan');
    expect(resolveStatus('', false)).toBe('plan');
  });

  it('passes through valid statuses for non-airing shows', () => {
    expect(resolveStatus('watching', false)).toBe('watching');
    expect(resolveStatus('completed', false)).toBe('completed');
    expect(resolveStatus('dropped', false)).toBe('dropped');
  });

  it('downgrades completed to watching when the show is still airing', () => {
    expect(resolveStatus('completed', true)).toBe('watching');
  });

  it('leaves other statuses untouched even for airing shows', () => {
    expect(resolveStatus('dropped', true)).toBe('dropped');
    expect(resolveStatus('plan', true)).toBe('plan');
  });
});

describe('clampProgress', () => {
  it('defaults to 0 for non-finite input', () => {
    expect(clampProgress(undefined, 12)).toBe(0);
    expect(clampProgress(null, 12)).toBe(0);
    expect(clampProgress(NaN, 12)).toBe(0);
  });

  it('clamps progress above the total', () => {
    expect(clampProgress(50, 12)).toBe(12);
  });

  it('clamps negative values to zero', () => {
    expect(clampProgress(-5, 12)).toBe(0);
  });

  it('passes through when progress is within range', () => {
    expect(clampProgress(7, 12)).toBe(7);
    expect(clampProgress(0, 12)).toBe(0);
    expect(clampProgress(12, 12)).toBe(12);
  });

  it('does not clamp when total is unknown', () => {
    expect(clampProgress(9999, undefined)).toBe(9999);
    expect(clampProgress(9999, null)).toBe(9999);
  });
});

describe('resolveFavorite', () => {
  it('returns false when desired is false', () => {
    expect(
      resolveFavorite({ desired: false, current: true, currentCount: 3 }),
    ).toBe(false);
  });

  it('allows keeping an existing favourite even at the limit', () => {
    expect(
      resolveFavorite({
        desired: true,
        current: true,
        currentCount: FAVORITE_LIMIT,
      }),
    ).toBe(true);
  });

  it('allows adding a new favourite when under the limit', () => {
    expect(
      resolveFavorite({
        desired: true,
        current: false,
        currentCount: FAVORITE_LIMIT - 1,
      }),
    ).toBe(true);
  });

  it('silently refuses a new favourite at or beyond the limit', () => {
    expect(
      resolveFavorite({
        desired: true,
        current: false,
        currentCount: FAVORITE_LIMIT,
      }),
    ).toBe(false);
    expect(
      resolveFavorite({
        desired: true,
        current: false,
        currentCount: FAVORITE_LIMIT + 5,
      }),
    ).toBe(false);
  });

  it('accepts a custom limit', () => {
    expect(
      resolveFavorite({
        desired: true,
        current: false,
        currentCount: 2,
        limit: 2,
      }),
    ).toBe(false);
    expect(
      resolveFavorite({
        desired: true,
        current: false,
        currentCount: 1,
        limit: 2,
      }),
    ).toBe(true);
  });
});

describe('deriveActivityLabel', () => {
  it('emits "Planned to watch" on first add', () => {
    const label = deriveActivityLabel({
      prev: {},
      next: { status: 'plan', progress: 0, hasRating: false },
      totalEpisodes: 12,
    });
    expect(label).toBe('Planned to watch');
  });

  it('emits "Started watching" when toggling to watching with no progress', () => {
    const label = deriveActivityLabel({
      prev: { status: 'plan', progress: 0 },
      next: { status: 'watching', progress: 0, hasRating: false },
      totalEpisodes: 12,
    });
    expect(label).toBe('Started watching');
  });

  it('includes progress when advancing episodes while already watching', () => {
    const label = deriveActivityLabel({
      prev: { status: 'watching', progress: 3 },
      next: { status: 'watching', progress: 5, hasRating: false },
      totalEpisodes: 12,
    });
    expect(label).toBe('Watched 5/12');
  });

  it('handles progress without a known total', () => {
    const label = deriveActivityLabel({
      prev: { status: 'watching', progress: 3 },
      next: { status: 'watching', progress: 5, hasRating: false },
      totalEpisodes: null,
    });
    expect(label).toBe('Watched 5 eps');
  });

  it('emits "Marked as completed" on completion', () => {
    const label = deriveActivityLabel({
      prev: { status: 'watching', progress: 11 },
      next: { status: 'completed', progress: 12, hasRating: false },
      totalEpisodes: 12,
    });
    expect(label).toBe('Marked as completed');
  });

  it('combines status change with a new rating', () => {
    const label = deriveActivityLabel({
      prev: { status: 'watching', progress: 11 },
      next: {
        status: 'completed',
        progress: 12,
        hasRating: true,
        rating: 5,
      },
      totalEpisodes: 12,
    });
    expect(label).toBe('Marked as completed • Rated 5/5');
  });

  it('combines progress + rating + review write', () => {
    const label = deriveActivityLabel({
      prev: { status: 'watching', progress: 3, rating: null, review: '' },
      next: {
        status: 'watching',
        progress: 4,
        hasRating: true,
        rating: 4,
        review: 'Patient, surprising, worth it.',
      },
      totalEpisodes: 12,
    });
    expect(label).toBe('Watched 4/12 • Rated 4/5 • Wrote a review');
  });

  it('emits "Cleared rating" when rating is nulled from a real value', () => {
    const label = deriveActivityLabel({
      prev: { status: 'completed', progress: 12, rating: 5 },
      next: {
        status: 'completed',
        progress: 12,
        hasRating: true,
        rating: null,
      },
      totalEpisodes: 12,
    });
    expect(label).toBe('Cleared rating');
  });

  it('emits "Updated review" on review edits', () => {
    const label = deriveActivityLabel({
      prev: {
        status: 'completed',
        progress: 12,
        rating: 5,
        review: 'Original take.',
      },
      next: {
        status: 'completed',
        progress: 12,
        hasRating: false,
        review: 'Revised take.',
      },
      totalEpisodes: 12,
    });
    expect(label).toBe('Updated review');
  });

  it('emits "Removed review" when review is cleared', () => {
    const label = deriveActivityLabel({
      prev: { status: 'completed', progress: 12, review: 'Had opinions.' },
      next: {
        status: 'completed',
        progress: 12,
        hasRating: false,
        review: '',
      },
      totalEpisodes: 12,
    });
    expect(label).toBe('Removed review');
  });

  it('falls back to the status label when nothing actually changed', () => {
    const label = deriveActivityLabel({
      prev: { status: 'watching', progress: 3, rating: null, review: '' },
      next: { status: 'watching', progress: 3, hasRating: false },
      totalEpisodes: 12,
    });
    expect(label).toBe('Watching (3/12)');
  });
});
