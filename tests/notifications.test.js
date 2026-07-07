import { describe, expect, it } from 'vitest';
import {
  baselineSeenEpisodes,
  buildSeenPatchFromNotifications,
  computeNotifications,
  filterUnconfirmedDismissed,
  mergeOptimisticState,
  shouldClearOptimisticReadAt,
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

describe('mergeOptimisticState', () => {
  const baseState = {
    lastReadAt: 1_000,
    dismissedIds: ['airingToday:101:2026-05-04'],
    seenEpisodes: { 101: 12 },
  };

  it('returns the input state unchanged when there is nothing optimistic', () => {
    expect(mergeOptimisticState(baseState, [], null)).toBe(baseState);
    expect(mergeOptimisticState(baseState, undefined, undefined)).toBe(baseState);
  });

  it('overrides only lastReadAt when optimisticReadAt is set', () => {
    const merged = mergeOptimisticState(baseState, [], 5_000);
    expect(merged.lastReadAt).toBe(5_000);
    expect(merged.dismissedIds).toEqual(baseState.dismissedIds);
    expect(merged.seenEpisodes).toBe(baseState.seenEpisodes);
  });

  it('appends optimistic dismissed ids without dropping server ones', () => {
    const merged = mergeOptimisticState(baseState, ['finished:202'], null);
    expect(merged.dismissedIds).toEqual([
      'airingToday:101:2026-05-04',
      'finished:202',
    ]);
    expect(merged.lastReadAt).toBe(1_000);
  });

  it('combines both optimistic flags in one merge', () => {
    const merged = mergeOptimisticState(baseState, ['sequel:303:404'], 7_000);
    expect(merged.lastReadAt).toBe(7_000);
    expect(merged.dismissedIds).toEqual([
      'airingToday:101:2026-05-04',
      'sequel:303:404',
    ]);
  });

  it('handles missing server fields gracefully', () => {
    const merged = mergeOptimisticState({}, ['x'], 9_000);
    expect(merged.lastReadAt).toBe(9_000);
    expect(merged.dismissedIds).toEqual(['x']);
  });

  it('treats optimisticReadAt of 0 as a real value', () => {
    const merged = mergeOptimisticState(baseState, [], 0);
    expect(merged.lastReadAt).toBe(0);
  });
});

describe('shouldClearOptimisticReadAt', () => {
  it('returns false when there is no optimistic read', () => {
    expect(shouldClearOptimisticReadAt(1_000, null)).toBe(false);
    expect(shouldClearOptimisticReadAt(1_000, undefined)).toBe(false);
  });

  it('returns false when the server has no lastReadAt yet', () => {
    expect(shouldClearOptimisticReadAt(null, 5_000)).toBe(false);
    expect(shouldClearOptimisticReadAt(undefined, 5_000)).toBe(false);
  });

  it('returns true when the server caught up to the optimistic value', () => {
    expect(shouldClearOptimisticReadAt(5_000, 5_000)).toBe(true);
  });

  it('returns true within the 2s clock-skew tolerance', () => {
    expect(shouldClearOptimisticReadAt(4_500, 5_000)).toBe(true);
    expect(shouldClearOptimisticReadAt(3_001, 5_000)).toBe(true);
  });

  it('returns false when the server timestamp is older than the skew window', () => {
    expect(shouldClearOptimisticReadAt(2_000, 5_000)).toBe(false);
  });
});

describe('filterUnconfirmedDismissed', () => {
  it('returns the input list when there is nothing optimistic', () => {
    const empty = [];
    expect(filterUnconfirmedDismissed(empty, ['a', 'b'])).toBe(empty);
  });

  it('removes ids that the server already confirmed', () => {
    expect(
      filterUnconfirmedDismissed(['a', 'b', 'c'], ['b']),
    ).toEqual(['a', 'c']);
  });

  it('keeps every id when none have been confirmed yet', () => {
    expect(filterUnconfirmedDismissed(['a', 'b'], [])).toEqual(['a', 'b']);
    expect(filterUnconfirmedDismissed(['a', 'b'], null)).toEqual(['a', 'b']);
  });
});

describe('buildSeenPatchFromNotifications', () => {
  it('extracts {malId: episodes} only for newEpisode entries', () => {
    const notifications = [
      { id: 'newEpisode:101:12', kind: 'newEpisode', malId: 101, extra: { episodes: 12 } },
      { id: 'airingToday:202:2026-05-04', kind: 'airingToday', malId: 202 },
      { id: 'newEpisode:303:8', kind: 'newEpisode', malId: 303, extra: { episodes: 8 } },
    ];
    expect(buildSeenPatchFromNotifications(notifications)).toEqual({
      101: 12,
      303: 8,
    });
  });

  it('returns an empty object for non-arrays and empty input', () => {
    expect(buildSeenPatchFromNotifications(null)).toEqual({});
    expect(buildSeenPatchFromNotifications([])).toEqual({});
  });

  it('skips newEpisode notifications missing the episode count', () => {
    expect(
      buildSeenPatchFromNotifications([
        { kind: 'newEpisode', malId: 101 },
        { kind: 'newEpisode', malId: 102, extra: {} },
      ]),
    ).toEqual({});
  });
});
