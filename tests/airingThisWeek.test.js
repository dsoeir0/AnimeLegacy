import { afterEach, describe, expect, it, vi } from 'vitest';
import { flattenAiringList } from '../lib/utils/airingThisWeek';

const fakeAnime = (id, time) => ({
  mal_id: id,
  title: `Show ${id}`,
  broadcast: time ? { time } : null,
});

const stubJstTz = () =>
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-540);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('flattenAiringList', () => {
  it('returns [] for invalid input', () => {
    stubJstTz();
    expect(flattenAiringList(null)).toEqual([]);
    expect(flattenAiringList(undefined)).toEqual([]);
    expect(flattenAiringList('nope')).toEqual([]);
  });

  it('skips items without a broadcast time', () => {
    stubJstTz();
    const data = { monday: [fakeAnime(1)] };
    expect(flattenAiringList(data, new Date(2026, 0, 5))).toEqual([]);
  });

  it('sorts upcoming first (today before later in week)', () => {
    stubJstTz();
    const data = {
      monday: [fakeAnime(1, '23:00')],
      friday: [fakeAnime(2, '23:00')],
    };
    const monday = new Date(2026, 0, 5);
    const result = flattenAiringList(data, monday);
    expect(result[0].anime.mal_id).toBe(1);
    expect(result[1].anime.mal_id).toBe(2);
  });

  it('wraps around: today=Sunday, Saturday item is 6 days away', () => {
    stubJstTz();
    const data = { saturday: [fakeAnime(1, '23:00')] };
    const sunday = new Date(2026, 0, 11);
    const result = flattenAiringList(data, sunday);
    expect(result[0].daysFromToday).toBe(6);
  });

  it('within same day, sorts by local time ascending', () => {
    stubJstTz();
    const data = {
      monday: [fakeAnime(1, '23:00'), fakeAnime(2, '08:00'), fakeAnime(3, '15:30')],
    };
    const monday = new Date(2026, 0, 5);
    const result = flattenAiringList(data, monday);
    expect(result.map((r) => r.anime.mal_id)).toEqual([2, 3, 1]);
  });

  it('attaches localDayKey + localTime + daysFromToday', () => {
    stubJstTz();
    const data = { tuesday: [fakeAnime(1, '23:00')] };
    const monday = new Date(2026, 0, 5);
    const [first] = flattenAiringList(data, monday);
    expect(first.localDayKey).toBe('tuesday');
    expect(first.localTime).toBe('23:00');
    expect(first.daysFromToday).toBe(1);
  });
});
