import { describe, expect, it } from 'vitest';
import {
  pickCharacterOfMonth,
  pickPrincipalRole,
  pickPrincipalVoice,
} from '../lib/utils/characterOfMonth';

describe('pickCharacterOfMonth', () => {
  const pool = Array.from({ length: 30 }, (_, i) => ({ mal_id: i + 1 }));

  it('returns null for empty pool', () => {
    expect(pickCharacterOfMonth([])).toBeNull();
    expect(pickCharacterOfMonth(null)).toBeNull();
    expect(pickCharacterOfMonth(undefined)).toBeNull();
  });

  it('is stable within the same month', () => {
    const day1 = new Date('2026-05-01T08:00:00Z');
    const day27 = new Date('2026-05-27T22:00:00Z');
    expect(pickCharacterOfMonth(pool, day1)).toEqual(
      pickCharacterOfMonth(pool, day27),
    );
  });

  it('rotates on month rollover', () => {
    const may = new Date('2026-05-15T12:00:00Z');
    const june = new Date('2026-06-15T12:00:00Z');
    expect(pickCharacterOfMonth(pool, may)).not.toEqual(
      pickCharacterOfMonth(pool, june),
    );
  });

  it('cycles deterministically through the pool', () => {
    const picks = new Set();
    for (let m = 0; m < 30; m += 1) {
      const date = new Date(2026, m, 15);
      picks.add(pickCharacterOfMonth(pool, date).mal_id);
    }
    expect(picks.size).toBe(30);
  });

  it('wraps around when pool is shorter than 30', () => {
    const small = [{ mal_id: 1 }, { mal_id: 2 }, { mal_id: 3 }];
    const a = pickCharacterOfMonth(small, new Date(2026, 0, 1));
    const b = pickCharacterOfMonth(small, new Date(2026, 3, 1));
    expect(a.mal_id).toBe(b.mal_id);
  });
});

describe('pickPrincipalRole', () => {
  it('returns null for empty input', () => {
    expect(pickPrincipalRole([])).toBeNull();
    expect(pickPrincipalRole(null)).toBeNull();
  });

  it('prefers Main role over Supporting', () => {
    const entries = [
      { role: 'Supporting', anime: { mal_id: 1 } },
      { role: 'Main', anime: { mal_id: 2 } },
    ];
    expect(pickPrincipalRole(entries).anime.mal_id).toBe(2);
  });

  it('falls back to first entry when no Main role exists', () => {
    const entries = [
      { role: 'Supporting', anime: { mal_id: 9 } },
      { role: 'Supporting', anime: { mal_id: 10 } },
    ];
    expect(pickPrincipalRole(entries).anime.mal_id).toBe(9);
  });
});

describe('pickPrincipalVoice', () => {
  it('returns null for empty input', () => {
    expect(pickPrincipalVoice([])).toBeNull();
    expect(pickPrincipalVoice(null)).toBeNull();
  });

  it('prefers Japanese over other languages', () => {
    const entries = [
      { language: 'English', person: { mal_id: 1 } },
      { language: 'Japanese', person: { mal_id: 2 } },
      { language: 'German', person: { mal_id: 3 } },
    ];
    expect(pickPrincipalVoice(entries).person.mal_id).toBe(2);
  });

  it('falls back to first entry when no Japanese voice exists', () => {
    const entries = [
      { language: 'English', person: { mal_id: 5 } },
      { language: 'German', person: { mal_id: 6 } },
    ];
    expect(pickPrincipalVoice(entries).person.mal_id).toBe(5);
  });
});
