import { describe, expect, it } from 'vitest';
import {
  baselineSeenEpisodes,
  computeNotifications,
} from '../lib/utils/notifications';

const aMonday = new Date('2026-05-04T10:00:00');

const monAired = (id, title = `Anime ${id}`) => ({ mal_id: id, title });

const listEntry = (id, overrides = {}) => ({
  id: String(id),
  title: `Anime ${id}`,
  status: 'watching',
  progress: 0,
  episodesTotal: 12,
  ...overrides,
});

describe('computeNotifications', () => {
  it('returns nothing when list is empty', () => {
    const out = computeNotifications({ listEntries: [], now: aMonday });
    expect(out).toEqual([]);
  });

  it('flags airing today for watching entries in schedule', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101), listEntry(102, { status: 'plan' })],
      schedulesByDay: { monday: [monAired(101), monAired(102)] },
      now: aMonday,
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('airingToday');
    expect(out[0].malId).toBe(101);
  });

  it('flags airing tomorrow when entry is on next day schedule', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101)],
      schedulesByDay: { tuesday: [monAired(101)] },
      now: aMonday,
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('airingTomorrow');
  });

  it('flags new episode when seenEpisodes is behind episodesTotal', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101, { episodesTotal: 12 })],
      schedulesByDay: null,
      state: { seenEpisodes: { 101: 10 } },
      now: aMonday,
    });
    const kinds = out.map((n) => n.kind);
    expect(kinds).toContain('newEpisode');
    const ne = out.find((n) => n.kind === 'newEpisode');
    expect(ne.extra.episodes).toBe(12);
    expect(ne.extra.since).toBe(10);
  });

  it('does not flag new episode without a baseline', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101, { episodesTotal: 12 })],
      now: aMonday,
    });
    expect(out.filter((n) => n.kind === 'newEpisode')).toEqual([]);
  });

  it('flags finished for plan/watching entries not in this week\'s schedule', () => {
    const out = computeNotifications({
      listEntries: [
        listEntry(101, { status: 'plan', episodesTotal: 12, progress: 0 }),
      ],
      schedulesByDay: { monday: [] },
      now: aMonday,
    });
    const f = out.find((n) => n.kind === 'finished');
    expect(f).toBeDefined();
    expect(f.extra.remaining).toBe(12);
  });

  it('does not flag finished when entry is in this week\'s schedule', () => {
    const out = computeNotifications({
      listEntries: [
        listEntry(101, { status: 'plan', episodesTotal: 12, progress: 0 }),
      ],
      schedulesByDay: { friday: [monAired(101)] },
      now: aMonday,
    });
    expect(out.filter((n) => n.kind === 'finished')).toEqual([]);
  });

  it('flags sequel for favorites with relations', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101, { status: 'completed', isFavorite: true })],
      relationsByFavorite: {
        101: { sequels: [{ mal_id: 200, title: 'Sequel One' }] },
      },
      now: aMonday,
    });
    const seq = out.find((n) => n.kind === 'sequel');
    expect(seq).toBeDefined();
    expect(seq.malId).toBe(200);
    expect(seq.title).toBe('Sequel One');
    expect(seq.extra.parentMalId).toBe(101);
  });

  it('filters out dismissed ids', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101)],
      schedulesByDay: { monday: [monAired(101)] },
      state: { dismissedIds: ['airingToday:101:2026-05-04'] },
      now: aMonday,
    });
    expect(out).toEqual([]);
  });

  it('marks notifications as read when lastReadAt is recent', () => {
    const out = computeNotifications({
      listEntries: [listEntry(101)],
      schedulesByDay: { monday: [monAired(101)] },
      state: { lastReadAt: aMonday.getTime() + 1000 },
      now: aMonday,
    });
    expect(out[0].read).toBe(true);
  });

  it('stamps createdAt to start-of-day so markAllRead survives later renders', () => {
    const noon = new Date('2026-05-04T12:00:00');
    const evening = new Date('2026-05-04T23:30:00');
    const out = computeNotifications({
      listEntries: [listEntry(101)],
      schedulesByDay: { monday: [monAired(101)] },
      state: { lastReadAt: noon.getTime() },
      now: evening,
    });
    expect(out[0].read).toBe(true);
  });

  it('sorts by kind priority then title', () => {
    const out = computeNotifications({
      listEntries: [
        listEntry(101, { title: 'Z Show', episodesTotal: 12, progress: 0 }),
        listEntry(102, { title: 'A Show', status: 'plan', episodesTotal: 12, progress: 0 }),
      ],
      schedulesByDay: { monday: [monAired(101, 'Z Show')] },
      now: aMonday,
    });
    expect(out.map((n) => n.kind)).toEqual(['airingToday', 'finished']);
  });
});

describe('baselineSeenEpisodes', () => {
  it('returns episodes to baseline for watching entries with episodesTotal', () => {
    const patch = baselineSeenEpisodes(
      [
        listEntry(101, { episodesTotal: 12 }),
        listEntry(102, { episodesTotal: null }),
        listEntry(103, { episodesTotal: 24, status: 'plan' }),
      ],
      {},
    );
    expect(patch).toEqual({ 101: 12 });
  });

  it('does not overwrite existing baseline', () => {
    const patch = baselineSeenEpisodes(
      [listEntry(101, { episodesTotal: 12 })],
      { 101: 10 },
    );
    expect(patch).toEqual({});
  });
});
