// Unit tests for the anime list utilities — mostly dedupeByMalId, which
// defends grids from Jikan's habit of returning the same show multiple
// times in one response (schedules with multiple broadcast rows, etc.).

import { describe, expect, it } from 'vitest';
import {
  dedupeByMalId,
  filterOutHentai,
  isAiringAnime,
  isAiringWithSeasonHeuristic,
  isHentaiAnime,
  normalizeAnime,
  primaryStudioName,
  slimAnimeForDiscover,
} from '../lib/utils/anime';

describe('dedupeByMalId', () => {
  it('returns empty array for empty input and defaults', () => {
    expect(dedupeByMalId([])).toEqual([]);
    expect(dedupeByMalId()).toEqual([]);
  });

  it('removes duplicate mal_ids, keeping the first occurrence', () => {
    const items = [
      { mal_id: 1, title: 'A' },
      { mal_id: 2, title: 'B' },
      { mal_id: 1, title: 'A (duplicate)' },
      { mal_id: 1, title: 'A (triplicate)' },
      { mal_id: 3, title: 'C' },
    ];
    const result = dedupeByMalId(items);
    expect(result).toEqual([
      { mal_id: 1, title: 'A' },
      { mal_id: 2, title: 'B' },
      { mal_id: 3, title: 'C' },
    ]);
  });

  it('preserves insertion order', () => {
    const items = [
      { mal_id: 5, title: 'Fifth' },
      { mal_id: 1, title: 'First' },
      { mal_id: 5, title: 'Fifth (dupe)' },
      { mal_id: 3, title: 'Third' },
    ];
    expect(dedupeByMalId(items).map((x) => x.title)).toEqual([
      'Fifth',
      'First',
      'Third',
    ]);
  });

  it('keeps items without a mal_id as-is (can\'t dedupe them)', () => {
    const items = [
      { title: 'No id #1' },
      { mal_id: 10, title: 'Has id' },
      { title: 'No id #2' },
      { mal_id: 10, title: 'Has id (dupe)' },
    ];
    expect(dedupeByMalId(items)).toEqual([
      { title: 'No id #1' },
      { mal_id: 10, title: 'Has id' },
      { title: 'No id #2' },
    ]);
  });

  it('handles the real-world case from Jikan /schedules', () => {
    // Mirrors what /schedules?filter=monday returned when the bug was
    // reported: the same show listed 3 times with identical mal_id.
    const jikanResponse = [
      { mal_id: 42, title: 'Show A' },
      { mal_id: 62983, title: 'Marika-chan' },
      { mal_id: 62983, title: 'Marika-chan' },
      { mal_id: 62983, title: 'Marika-chan' },
      { mal_id: 99, title: 'Show B' },
    ];
    expect(dedupeByMalId(jikanResponse)).toHaveLength(3);
  });
});

describe('primaryStudioName', () => {
  it('returns the first studio name', () => {
    expect(primaryStudioName({ studios: [{ name: 'Bones' }, { name: 'other' }] })).toBe('Bones');
  });

  it('returns empty string when studios are missing or malformed', () => {
    expect(primaryStudioName({})).toBe('');
    expect(primaryStudioName(null)).toBe('');
    expect(primaryStudioName({ studios: [] })).toBe('');
    expect(primaryStudioName({ studios: [{}] })).toBe('');
  });
});

describe('slimAnimeForDiscover', () => {
  it('trims the payload to the fields the discover page renders', () => {
    const full = {
      mal_id: 1,
      title: 'Test',
      synopsis: 'Body',
      score: 8.5,
      rank: 42,
      year: 2024,
      type: 'TV',
      episodes: 12,
      duration: '24 min',
      popularity: 100,
      members: 999,
      genres: [{ mal_id: 1, name: 'Action' }, 'Drama'],
      studios: [{ mal_id: 4, name: 'Bones' }],
      images: { webp: { image_url: 'x', large_image_url: 'X' } },
      // fields that should be stripped
      producers: [{ mal_id: 17, name: 'Aniplex' }],
      title_synonyms: ['Alt'],
      broadcast: { day: 'Sundays' },
    };
    const slim = slimAnimeForDiscover(full);
    expect(slim.mal_id).toBe(1);
    expect(slim.score).toBe(8.5);
    expect(slim.genres).toEqual([
      { mal_id: 1, name: 'Action' },
      'Drama',
    ]);
    expect(slim.studios).toEqual([{ mal_id: 4, name: 'Bones' }]);
    expect(slim.producers).toBeUndefined();
    expect(slim.title_synonyms).toBeUndefined();
    expect(slim.broadcast).toBeUndefined();
  });

  it('coerces missing optional fields to null, not undefined', () => {
    const slim = slimAnimeForDiscover({ mal_id: 1, title: 'x' });
    expect(slim.score).toBeNull();
    expect(slim.rank).toBeNull();
    expect(slim.year).toBeNull();
    expect(slim.type).toBeNull();
    expect(slim.aired).toBeNull();
  });
});

describe('isHentaiAnime', () => {
  it('detects rating containing "hentai"', () => {
    expect(isHentaiAnime({ rating: 'Rx - Hentai' })).toBe(true);
    expect(isHentaiAnime({ rating: 'rx - hentai' })).toBe(true);
  });

  it('detects hentai in genres', () => {
    expect(isHentaiAnime({ genres: [{ name: 'Hentai' }] })).toBe(true);
    expect(isHentaiAnime({ genres: [{ name: 'hentai' }] })).toBe(true);
  });

  it('detects hentai in explicit_genres (Jikan splits it out sometimes)', () => {
    expect(isHentaiAnime({ explicit_genres: [{ name: 'Hentai' }] })).toBe(true);
  });

  it('returns false for safe content', () => {
    expect(isHentaiAnime({ rating: 'PG-13', genres: [{ name: 'Action' }] })).toBe(false);
    expect(isHentaiAnime({ rating: 'R+ - Mild Nudity', genres: [{ name: 'Ecchi' }] })).toBe(false);
  });

  it('returns false for null / empty / malformed input', () => {
    expect(isHentaiAnime(null)).toBe(false);
    expect(isHentaiAnime(undefined)).toBe(false);
    expect(isHentaiAnime({})).toBe(false);
    expect(isHentaiAnime({ genres: null })).toBe(false);
  });

  it('handles genre entries that are not objects', () => {
    // Defensive — production normally has {name} but some adapters pass strings
    expect(isHentaiAnime({ genres: ['Action'] })).toBe(false);
    expect(isHentaiAnime({ genres: [null, undefined, {}] })).toBe(false);
  });
});

describe('filterOutHentai', () => {
  it('removes only the hentai entries', () => {
    const items = [
      { mal_id: 1, title: 'Safe', genres: [{ name: 'Action' }] },
      { mal_id: 2, title: 'Bad', genres: [{ name: 'Hentai' }] },
      { mal_id: 3, title: 'AlsoSafe', rating: 'PG-13' },
      { mal_id: 4, title: 'AlsoBad', rating: 'Rx - Hentai' },
    ];
    const result = filterOutHentai(items);
    expect(result.map((x) => x.mal_id)).toEqual([1, 3]);
  });

  it('returns empty for empty / no input', () => {
    expect(filterOutHentai([])).toEqual([]);
    expect(filterOutHentai()).toEqual([]);
  });
});

describe('isAiringAnime', () => {
  it('returns true when airing flag is true', () => {
    expect(isAiringAnime({ airing: true })).toBe(true);
  });

  it('returns true when status mentions airing', () => {
    expect(isAiringAnime({ status: 'Currently Airing' })).toBe(true);
    expect(isAiringAnime({ status: 'currently airing' })).toBe(true);
  });

  it('returns false when status mentions finished, even if airing flag is missing', () => {
    expect(isAiringAnime({ status: 'Finished Airing' })).toBe(false);
  });

  it('returns false for unknown / missing status', () => {
    expect(isAiringAnime({})).toBe(false);
    expect(isAiringAnime(null)).toBe(false);
    expect(isAiringAnime({ status: 'Not yet aired' })).toBe(false);
  });
});

describe('isAiringWithSeasonHeuristic', () => {
  const ctx = { currentSeason: 'spring', currentYear: 2026 };

  it('returns true when any source has airing === true', () => {
    expect(
      isAiringWithSeasonHeuristic([{ airing: true }, null, undefined], ctx),
    ).toBe(true);
  });

  it('returns true when isAiringAnime matches any source', () => {
    expect(
      isAiringWithSeasonHeuristic([{ status: 'Currently Airing' }], ctx),
    ).toBe(true);
  });

  it('returns true when first non-nullish season+year+type match the current cohort', () => {
    const detail = { season: 'spring', year: 2026, type: 'TV' };
    expect(isAiringWithSeasonHeuristic([detail], ctx)).toBe(true);
  });

  it('combines fields across sources, picking first non-nullish for each', () => {
    // detail has season but no year; item supplies year; type comes from item
    const detail = { season: 'spring' };
    const item = { year: 2026, type: 'TV' };
    expect(isAiringWithSeasonHeuristic([detail, item], ctx)).toBe(true);
  });

  it('returns false when season does not match the current cohort', () => {
    expect(
      isAiringWithSeasonHeuristic([{ season: 'fall', year: 2026, type: 'TV' }], ctx),
    ).toBe(false);
  });

  it('returns false when year does not match', () => {
    expect(
      isAiringWithSeasonHeuristic([{ season: 'spring', year: 2025, type: 'TV' }], ctx),
    ).toBe(false);
  });

  it('returns false when type is not a TV format', () => {
    expect(
      isAiringWithSeasonHeuristic([{ season: 'spring', year: 2026, type: 'Movie' }], ctx),
    ).toBe(false);
  });

  it('accepts a single source (not an array)', () => {
    expect(isAiringWithSeasonHeuristic({ airing: true }, ctx)).toBe(true);
  });

  it('returns false when all sources are nullish or empty', () => {
    expect(isAiringWithSeasonHeuristic([null, undefined, {}], ctx)).toBe(false);
    expect(isAiringWithSeasonHeuristic([], ctx)).toBe(false);
  });

  it('skips finished-airing status (defers to isAiringAnime, which excludes it)', () => {
    expect(
      isAiringWithSeasonHeuristic([{ status: 'Finished Airing' }], ctx),
    ).toBe(false);
  });

  it('falls back to current date when ctx is omitted (smoke test)', () => {
    // We can't assert a value without mocking the date, but we can assert
    // that the function doesn't throw and returns a boolean.
    expect(typeof isAiringWithSeasonHeuristic([{ airing: true }])).toBe('boolean');
  });
});

describe('normalizeAnime', () => {
  it('returns null for nullish input or input without an id', () => {
    expect(normalizeAnime(null)).toBeNull();
    expect(normalizeAnime(undefined)).toBeNull();
    expect(normalizeAnime({})).toBeNull();
    expect(normalizeAnime({ title: 'no id' })).toBeNull();
  });

  it('prefers mal_id but accepts id as fallback', () => {
    expect(normalizeAnime({ mal_id: 1, title: 'A' }).id).toBe(1);
    expect(normalizeAnime({ id: 99, title: 'A' }).id).toBe(99);
  });

  it('falls back to title_english then "Untitled"', () => {
    expect(normalizeAnime({ mal_id: 1, title_english: 'Eng' }).title).toBe('Eng');
    expect(normalizeAnime({ mal_id: 1 }).title).toBe('Untitled');
  });

  it('reads year from top-level field or from aired.prop.from.year', () => {
    expect(normalizeAnime({ mal_id: 1, year: 2024 }).year).toBe(2024);
    expect(
      normalizeAnime({
        mal_id: 1,
        aired: { prop: { from: { year: 2020 } } },
      }).year,
    ).toBe(2020);
    expect(normalizeAnime({ mal_id: 1 }).year).toBeNull();
  });

  it('flattens genres to a string array', () => {
    expect(
      normalizeAnime({
        mal_id: 1,
        genres: [{ name: 'Action' }, 'Drama', { name: '' }, null],
      }).genres,
    ).toEqual(['Action', 'Drama']);
  });

  it('coerces airing to a boolean', () => {
    expect(normalizeAnime({ mal_id: 1, airing: true }).airing).toBe(true);
    expect(normalizeAnime({ mal_id: 1, airing: 'truthy' }).airing).toBe(true);
    expect(normalizeAnime({ mal_id: 1 }).airing).toBe(false);
  });

  it('defaults type to "Series" when missing, prefers format if present', () => {
    expect(normalizeAnime({ mal_id: 1 }).type).toBe('Series');
    expect(normalizeAnime({ mal_id: 1, format: 'Movie' }).type).toBe('Movie');
    expect(normalizeAnime({ mal_id: 1, type: 'TV', format: 'Movie' }).type).toBe('TV');
  });
});
