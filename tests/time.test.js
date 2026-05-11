import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WEEKDAY_KEYS,
  formatRelativeTime,
  isSameCalendarDay,
  weekdayDates,
} from '../lib/utils/time.js';

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-05-11T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for falsy or invalid input', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime(undefined)).toBe('');
    expect(formatRelativeTime('')).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });

  it('accepts Firestore-style Timestamp with .toDate()', () => {
    const tsLike = { toDate: () => new Date('2026-05-11T11:30:00Z') };
    expect(formatRelativeTime(tsLike)).toMatch(/minute/);
  });

  it('uses minutes for differences under 60 minutes', () => {
    expect(formatRelativeTime(new Date('2026-05-11T11:30:00Z'))).toMatch(/minute/);
  });

  it('uses hours between 1 hour and 24 hours', () => {
    expect(formatRelativeTime(new Date('2026-05-11T08:00:00Z'))).toMatch(/hour/);
  });

  it('uses days beyond 24 hours', () => {
    expect(formatRelativeTime(new Date('2026-05-08T12:00:00Z'))).toMatch(/day/);
  });
});

describe('isSameCalendarDay', () => {
  it('returns true for two dates on the same calendar day', () => {
    const a = new Date(2026, 4, 11, 8, 0, 0);
    const b = new Date(2026, 4, 11, 23, 59, 0);
    expect(isSameCalendarDay(a, b)).toBe(true);
  });

  it('returns false across day boundaries', () => {
    const a = new Date(2026, 4, 11, 23, 59, 0);
    const b = new Date(2026, 4, 12, 0, 0, 1);
    expect(isSameCalendarDay(a, b)).toBe(false);
  });

  it('returns false across month or year boundaries', () => {
    expect(isSameCalendarDay(new Date(2026, 4, 31), new Date(2026, 5, 1))).toBe(false);
    expect(isSameCalendarDay(new Date(2025, 11, 31), new Date(2026, 0, 1))).toBe(false);
  });
});

describe('weekdayDates', () => {
  it('returns 7 entries keyed monday → sunday', () => {
    const result = weekdayDates(new Date(2026, 4, 13));
    expect(result.map((r) => r.key)).toEqual(WEEKDAY_KEYS);
  });

  it('anchors the week on Monday when today is mid-week', () => {
    const wednesday = new Date(2026, 4, 13);
    const result = weekdayDates(wednesday);
    expect(result[0].date.getDay()).toBe(1);
    expect(result[6].date.getDay()).toBe(0);
  });

  it('treats Sunday as the last day of the previous Monday-anchored week', () => {
    const sunday = new Date(2026, 4, 17);
    const result = weekdayDates(sunday);
    expect(result[0].date.getDate()).toBe(11);
    expect(result[6].date.getDate()).toBe(17);
  });

  it('handles Monday itself as day 0 of the week', () => {
    const monday = new Date(2026, 4, 11);
    const result = weekdayDates(monday);
    expect(result[0].date.getDate()).toBe(11);
  });
});
