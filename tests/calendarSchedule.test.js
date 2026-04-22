import { afterEach, describe, expect, it, vi } from 'vitest';
import { jstToLocalSlot } from '../lib/utils/time';
import { bucketizeSchedule } from '../lib/utils/calendarSchedule';

// getTimezoneOffset returns minutes to ADD to local to reach UTC — so east
// of UTC is negative (Tokyo = -540) and west is positive. We mock it so
// tests are reproducible regardless of the machine's TZ.
const withTzOffset = (offsetMin) =>
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(offsetMin);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('jstToLocalSlot', () => {
  it('returns null for malformed input', () => {
    withTzOffset(0);
    expect(jstToLocalSlot(0, null)).toBeNull();
    expect(jstToLocalSlot(0, 'abc')).toBeNull();
    expect(jstToLocalSlot(0, '25:00')).toBeNull();
    expect(jstToLocalSlot(-1, '10:00')).toBeNull();
    expect(jstToLocalSlot(7, '10:00')).toBeNull();
  });

  it('stays on same day when no wrap crossing (UTC+1, JST evening)', () => {
    withTzOffset(-60); // local = UTC+1
    // JST 23:30 Monday - 8h = local 15:30 Monday
    expect(jstToLocalSlot(0, '23:30')).toEqual({
      dayIdx: 0,
      hour: 15,
      minute: 30,
      display: '15:30',
    });
  });

  it('wraps to previous day for late-night JST (UTC+1)', () => {
    withTzOffset(-60);
    // JST 00:30 Monday - 8h = local 16:30 Sunday
    expect(jstToLocalSlot(0, '00:30')).toEqual({
      dayIdx: 6,
      hour: 16,
      minute: 30,
      display: '16:30',
    });
  });

  it('wraps Sunday JST back to Saturday local (UTC+1)', () => {
    withTzOffset(-60);
    expect(jstToLocalSlot(6, '00:30')).toEqual({
      dayIdx: 5,
      hour: 16,
      minute: 30,
      display: '16:30',
    });
  });

  it('wraps forward when local is east of JST (e.g. UTC+12)', () => {
    withTzOffset(-720); // local = UTC+12, +3h vs JST
    // JST 23:30 Monday + 3h = local 02:30 Tuesday
    expect(jstToLocalSlot(0, '23:30')).toEqual({
      dayIdx: 1,
      hour: 2,
      minute: 30,
      display: '02:30',
    });
  });

  it('handles large negative offsets (UTC-8 US west)', () => {
    withTzOffset(480); // local = UTC-8, -17h vs JST
    // JST 10:00 Friday - 17h = local 17:00 Thursday
    expect(jstToLocalSlot(4, '10:00')).toEqual({
      dayIdx: 3,
      hour: 17,
      minute: 0,
      display: '17:00',
    });
  });

  it('always formats display as zero-padded 24h', () => {
    withTzOffset(-60);
    expect(jstToLocalSlot(0, '09:05').display).toBe('01:05');
    expect(jstToLocalSlot(0, '09:00').display).toBe('01:00');
  });
});

describe('bucketizeSchedule', () => {
  const makeEntry = (mal_id, time, title = `Anime ${mal_id}`) => ({
    mal_id,
    title,
    broadcast: { time },
  });

  it('returns null for non-object input', () => {
    expect(bucketizeSchedule(null)).toBeNull();
    expect(bucketizeSchedule(undefined)).toBeNull();
  });

  it('returns empty structures for empty payload', () => {
    withTzOffset(0);
    const out = bucketizeSchedule({});
    expect(out.hours).toEqual([]);
    expect(out.slots.size).toBe(0);
    expect(out.countsByDay.monday).toBe(0);
  });

  it('places entries into local-day/local-hour slots (UTC+1)', () => {
    withTzOffset(-60);
    // Monday JST 23:30 → Monday local 15:30
    // Monday JST 00:30 → Sunday local 16:30 (day-shift)
    const out = bucketizeSchedule({
      monday: [makeEntry(1, '23:30'), makeEntry(2, '00:30')],
    });
    expect(out.slots.get('monday:15')).toHaveLength(1);
    expect(out.slots.get('monday:15')[0].item.mal_id).toBe(1);
    expect(out.slots.get('monday:15')[0].localTime).toBe('15:30');
    expect(out.slots.get('sunday:16')).toHaveLength(1);
    expect(out.slots.get('sunday:16')[0].item.mal_id).toBe(2);
    expect(out.countsByDay.monday).toBe(1);
    expect(out.countsByDay.sunday).toBe(1);
  });

  it('sorts multiple entries within a slot by minute', () => {
    withTzOffset(-60);
    const out = bucketizeSchedule({
      monday: [makeEntry(1, '23:45'), makeEntry(2, '23:10'), makeEntry(3, '23:30')],
    });
    const slot = out.slots.get('monday:15');
    expect(slot.map((e) => e.item.mal_id)).toEqual([2, 3, 1]); // 10, 30, 45
  });

  it('hours list contains only hours with entries, sorted ascending', () => {
    withTzOffset(-60);
    const out = bucketizeSchedule({
      monday: [makeEntry(1, '23:00')], // → local 15
      tuesday: [makeEntry(2, '07:00')], // → local 23 (prev day, Monday)
      wednesday: [makeEntry(3, '10:00')], // → local 02 (same day, Wed)
    });
    expect(out.hours).toEqual([2, 15, 23]);
  });

  it('skips entries with missing or malformed broadcast.time', () => {
    withTzOffset(-60);
    const out = bucketizeSchedule({
      monday: [
        makeEntry(1, '23:30'),
        { mal_id: 2, title: 'No time', broadcast: null },
        { mal_id: 3, title: 'Bad time', broadcast: { time: 'midnight' } },
      ],
    });
    expect(out.hours).toEqual([15]);
    expect(out.slots.get('monday:15')).toHaveLength(1);
    expect(out.countsByDay.monday).toBe(1);
  });

  it('builds jst→local time map for tooltip cross-reference', () => {
    withTzOffset(-60);
    const out = bucketizeSchedule({
      monday: [makeEntry(1, '23:30'), makeEntry(2, '00:30')],
    });
    expect(out.timeByJst.get('23:30')).toBe('15:30');
    expect(out.timeByJst.get('00:30')).toBe('16:30');
  });
});
