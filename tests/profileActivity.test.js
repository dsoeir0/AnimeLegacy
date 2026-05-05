// Pure unit tests for the profile-activity helpers. Covers the temporal
// edge cases that are easy to regress silently — streaks across day
// boundaries, Firestore Timestamp vs Date vs ISO-string normalisation,
// and the genre-bar tally.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildStreakDots,
  computeGenreBars,
  computeStreak,
  dateKey,
  deriveVerb,
  groupActivityByDay,
  toJsDate,
} from '../lib/utils/profileActivity';

// Build a Date for a local-calendar day at noon, so we never trip on
// midnight-DST surprises while computing keys.
const localNoon = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0, 0);

describe('toJsDate', () => {
  it('returns null for null/undefined/empty', () => {
    expect(toJsDate(null)).toBeNull();
    expect(toJsDate(undefined)).toBeNull();
    expect(toJsDate('')).toBeNull();
  });

  it('unwraps Firestore Timestamp-like values via toDate()', () => {
    const date = new Date('2026-04-01T10:00:00Z');
    const ts = { toDate: () => date };
    expect(toJsDate(ts)).toBe(date);
  });

  it('parses ISO strings', () => {
    const result = toJsDate('2026-04-01T10:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-04-01T10:00:00.000Z');
  });

  it('accepts Date instances directly', () => {
    const date = new Date('2026-04-01T10:00:00Z');
    expect(toJsDate(date).getTime()).toBe(date.getTime());
  });

  it('returns null for unparseable strings', () => {
    expect(toJsDate('not-a-date')).toBeNull();
  });
});

describe('dateKey', () => {
  it('formats a Date as YYYY-MM-DD using local components', () => {
    expect(dateKey(localNoon(2026, 4, 1))).toBe('2026-04-01');
  });

  it('zero-pads single-digit months and days', () => {
    expect(dateKey(localNoon(2026, 1, 5))).toBe('2026-01-05');
    expect(dateKey(localNoon(2026, 12, 31))).toBe('2026-12-31');
  });

  it('returns empty string for nullish input', () => {
    expect(dateKey(null)).toBe('');
    expect(dateKey(undefined)).toBe('');
  });
});

describe('deriveVerb', () => {
  it('detects review labels', () => {
    expect(deriveVerb({ label: 'Posted a review' })).toBe('review');
    expect(deriveVerb({ label: 'REVIEWED' })).toBe('review');
  });

  it('detects completed labels', () => {
    expect(deriveVerb({ label: 'Marked as completed' })).toBe('complete');
  });

  it('detects rated labels', () => {
    expect(deriveVerb({ label: 'Rated 8/10' })).toBe('rate');
  });

  it('falls back to watch for anything else', () => {
    expect(deriveVerb({ label: 'Ep 5/12 • Watching' })).toBe('watch');
    expect(deriveVerb({ label: 'Started' })).toBe('watch');
    expect(deriveVerb({})).toBe('watch');
    expect(deriveVerb(null)).toBe('watch');
  });

  it('matches case-insensitively', () => {
    expect(deriveVerb({ label: 'Wrote a REVIEW' })).toBe('review');
  });
});

describe('computeStreak', () => {
  // Pin "now" so the streak math is deterministic. Use noon to keep the
  // setHours(0,0,0,0) inside computeStreak from crossing a day boundary.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(localNoon(2026, 4, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty / non-array input', () => {
    expect(computeStreak([])).toBe(0);
    expect(computeStreak(null)).toBe(0);
    expect(computeStreak(undefined)).toBe(0);
  });

  it('returns 0 when the most recent activity is older than yesterday', () => {
    const items = [{ createdAt: localNoon(2026, 4, 27) }]; // 3 days ago
    expect(computeStreak(items)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const items = [
      { createdAt: localNoon(2026, 4, 30) },
      { createdAt: localNoon(2026, 4, 29) },
      { createdAt: localNoon(2026, 4, 28) },
    ];
    expect(computeStreak(items)).toBe(3);
  });

  it('starts the streak from yesterday when today has no activity', () => {
    const items = [
      { createdAt: localNoon(2026, 4, 29) },
      { createdAt: localNoon(2026, 4, 28) },
    ];
    expect(computeStreak(items)).toBe(2);
  });

  it('breaks the streak at the first missing day', () => {
    const items = [
      { createdAt: localNoon(2026, 4, 30) },
      { createdAt: localNoon(2026, 4, 29) },
      // 28 is missing — 27 should not count
      { createdAt: localNoon(2026, 4, 27) },
    ];
    expect(computeStreak(items)).toBe(2);
  });

  it('deduplicates multiple entries on the same day', () => {
    const items = [
      { createdAt: localNoon(2026, 4, 30) },
      { createdAt: localNoon(2026, 4, 30) },
      { createdAt: localNoon(2026, 4, 30) },
    ];
    expect(computeStreak(items)).toBe(1);
  });

  it('skips entries with invalid createdAt', () => {
    const items = [
      { createdAt: localNoon(2026, 4, 30) },
      { createdAt: 'garbage' },
      { createdAt: null },
    ];
    expect(computeStreak(items)).toBe(1);
  });

  it('accepts Firestore Timestamp-like createdAt', () => {
    const items = [
      { createdAt: { toDate: () => localNoon(2026, 4, 30) } },
      { createdAt: { toDate: () => localNoon(2026, 4, 29) } },
    ];
    expect(computeStreak(items)).toBe(2);
  });
});

describe('buildStreakDots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(localNoon(2026, 4, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 7 dots ending today', () => {
    const dots = buildStreakDots([]);
    expect(dots).toHaveLength(7);
    expect(dots[6].today).toBe(true);
    expect(dots.slice(0, 6).every((d) => d.today === false)).toBe(true);
  });

  it('orders oldest first, today last', () => {
    const dots = buildStreakDots([]);
    expect(dots[0].key).toBe('2026-04-24');
    expect(dots[6].key).toBe('2026-04-30');
  });

  it('marks days with activity as active', () => {
    const dots = buildStreakDots([
      { createdAt: localNoon(2026, 4, 30) },
      { createdAt: localNoon(2026, 4, 28) },
    ]);
    const byKey = Object.fromEntries(dots.map((d) => [d.key, d]));
    expect(byKey['2026-04-30'].active).toBe(true);
    expect(byKey['2026-04-29'].active).toBe(false);
    expect(byKey['2026-04-28'].active).toBe(true);
  });

  it('ignores activity outside the 7-day window', () => {
    const dots = buildStreakDots([
      { createdAt: localNoon(2026, 4, 1) }, // way outside
    ]);
    expect(dots.every((d) => d.active === false)).toBe(true);
  });
});

describe('groupActivityByDay', () => {
  it('groups entries by local calendar day', () => {
    const a = { createdAt: localNoon(2026, 4, 30), label: 'first' };
    const b = { createdAt: localNoon(2026, 4, 30), label: 'second' };
    const c = { createdAt: localNoon(2026, 4, 29), label: 'third' };
    const groups = groupActivityByDay([a, b, c]);
    expect(groups).toHaveLength(2);
    const apr30 = groups.find((g) => g.key === '2026-04-30');
    expect(apr30.items).toEqual([a, b]); // source order preserved
    expect(apr30.day).toBe('30');
    expect(apr30.mo).toBe('APR');
    const apr29 = groups.find((g) => g.key === '2026-04-29');
    expect(apr29.items).toEqual([c]);
  });

  it('drops entries with no parseable createdAt', () => {
    const groups = groupActivityByDay([
      { createdAt: 'bad' },
      { createdAt: null },
      { createdAt: localNoon(2026, 4, 30), label: 'kept' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(groupActivityByDay([])).toEqual([]);
  });

  it('uses month abbreviations from the MONTH_ABBR table', () => {
    const groups = groupActivityByDay([
      { createdAt: localNoon(2026, 1, 5) },
      { createdAt: localNoon(2026, 7, 4) },
      { createdAt: localNoon(2026, 12, 25) },
    ]);
    const months = groups.map((g) => g.mo).sort();
    expect(months).toEqual(['DEC', 'JAN', 'JUL']);
  });
});

describe('computeGenreBars', () => {
  it('returns empty array for non-array input', () => {
    expect(computeGenreBars(null)).toEqual([]);
    expect(computeGenreBars(undefined)).toEqual([]);
    expect(computeGenreBars('nope')).toEqual([]);
  });

  it('counts genres from items with progress > 0 or status completed', () => {
    const items = [
      { progress: 5, genres: ['Action', 'Drama'] },
      { status: 'completed', genres: ['Action'] },
      { progress: 0, status: 'plan', genres: ['Comedy'] }, // ignored
    ];
    const bars = computeGenreBars(items);
    expect(bars.find((b) => b.name === 'Action').count).toBe(2);
    expect(bars.find((b) => b.name === 'Drama').count).toBe(1);
    expect(bars.find((b) => b.name === 'Comedy')).toBeUndefined();
  });

  it('keeps only the top 5, sorted by count desc', () => {
    const items = [
      { progress: 1, genres: ['A'] },
      { progress: 1, genres: ['A'] },
      { progress: 1, genres: ['A'] },
      { progress: 1, genres: ['B'] },
      { progress: 1, genres: ['B'] },
      { progress: 1, genres: ['C'] },
      { progress: 1, genres: ['D'] },
      { progress: 1, genres: ['E'] },
      { progress: 1, genres: ['F'] }, // sixth — should be dropped
    ];
    const bars = computeGenreBars(items);
    expect(bars).toHaveLength(5);
    expect(bars.map((b) => b.name)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('reports percentages relative to the leader', () => {
    const items = [
      { progress: 1, genres: ['A'] },
      { progress: 1, genres: ['A'] },
      { progress: 1, genres: ['A'] },
      { progress: 1, genres: ['A'] }, // A=4 (leader)
      { progress: 1, genres: ['B'] },
      { progress: 1, genres: ['B'] }, // B=2
      { progress: 1, genres: ['C'] }, // C=1
    ];
    const bars = computeGenreBars(items);
    const byName = Object.fromEntries(bars.map((b) => [b.name, b.pct]));
    expect(byName.A).toBe(100);
    expect(byName.B).toBe(50);
    expect(byName.C).toBe(25);
  });

  it('skips items with no genres array', () => {
    const items = [
      { progress: 5 }, // no genres
      { progress: 5, genres: 'Action' }, // not an array
      { progress: 5, genres: ['Drama'] },
    ];
    const bars = computeGenreBars(items);
    expect(bars).toEqual([{ name: 'Drama', count: 1, pct: 100 }]);
  });
});
