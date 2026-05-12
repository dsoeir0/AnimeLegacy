import { describe, expect, it } from 'vitest';
import {
  sortVoiceRolesByPopularity,
  yearOfVoiceRole,
} from '../lib/utils/voiceRoles';

const role = ({ favourites, popularity, year, airedFrom } = {}) => ({
  anime: {
    ...(Number.isFinite(favourites) ? { favourites } : {}),
    ...(Number.isFinite(popularity) ? { popularity } : {}),
    ...(year ? { year } : {}),
    ...(airedFrom ? { aired: { from: airedFrom } } : {}),
  },
});

describe('yearOfVoiceRole', () => {
  it('returns anime.year when finite', () => {
    expect(yearOfVoiceRole({ anime: { year: 2018 } })).toBe(2018);
  });

  it('falls back to aired.from year', () => {
    expect(
      yearOfVoiceRole({ anime: { aired: { from: '2016-04-04' } } }),
    ).toBe(2016);
  });

  it('returns null when no signal', () => {
    expect(yearOfVoiceRole({ anime: {} })).toBe(null);
    expect(yearOfVoiceRole(null)).toBe(null);
  });
});

describe('sortVoiceRolesByPopularity', () => {
  it('orders by anime favourites desc', () => {
    const a = role({ favourites: 100 });
    const b = role({ favourites: 50000 });
    const c = role({ favourites: 800 });
    const out = sortVoiceRolesByPopularity([a, b, c]);
    expect(out).toEqual([b, c, a]);
  });

  it('breaks ties by popularity rank asc (lower = more popular)', () => {
    const a = role({ favourites: 100, popularity: 800 });
    const b = role({ favourites: 100, popularity: 100 });
    const c = role({ favourites: 100, popularity: 4000 });
    const out = sortVoiceRolesByPopularity([a, b, c]);
    expect(out).toEqual([b, a, c]);
  });

  it('breaks remaining ties by year desc', () => {
    const a = role({ year: 2018 });
    const b = role({ year: 2024 });
    const c = role({ year: 2010 });
    const out = sortVoiceRolesByPopularity([a, b, c]);
    expect(out).toEqual([b, a, c]);
  });

  it('treats missing favourites as 0 and missing popularity as +Infinity', () => {
    const popular = role({ favourites: 10000 });
    const obscure = role({});
    const out = sortVoiceRolesByPopularity([obscure, popular]);
    expect(out[0]).toBe(popular);
  });

  it('does not mutate input array', () => {
    const arr = [role({ favourites: 100 }), role({ favourites: 5000 })];
    const before = [...arr];
    sortVoiceRolesByPopularity(arr);
    expect(arr).toEqual(before);
  });
});
