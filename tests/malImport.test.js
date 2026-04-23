import { describe, expect, it } from 'vitest';
import {
  favoriteAnimeIds,
  mapMalScore,
  mapMalStatus,
  parseMalYear,
  planFavoriteImport,
  summarizeImport,
  toFavoriteCharacterPayload,
  toImportPayload,
} from '../lib/utils/malImport';

describe('mapMalStatus', () => {
  it('maps MAL numeric statuses to our string keys', () => {
    expect(mapMalStatus(1)).toBe('watching');
    expect(mapMalStatus(2)).toBe('completed');
    expect(mapMalStatus(3)).toBe('on_hold');
    expect(mapMalStatus(4)).toBe('dropped');
    expect(mapMalStatus(6)).toBe('plan');
  });

  it('returns null for unknown or missing status', () => {
    expect(mapMalStatus(5)).toBeNull(); // MAL skipped 5 (was "Wont Watch")
    expect(mapMalStatus(0)).toBeNull();
    expect(mapMalStatus(undefined)).toBeNull();
    expect(mapMalStatus(null)).toBeNull();
    expect(mapMalStatus('completed')).toBeNull();
  });
});

describe('mapMalScore', () => {
  it('maps 1-10 MAL to our 0.5-5 half-star scale', () => {
    expect(mapMalScore(10)).toBe(5);
    expect(mapMalScore(9)).toBe(4.5);
    expect(mapMalScore(5)).toBe(2.5);
    expect(mapMalScore(1)).toBe(0.5);
  });

  it('treats 0 (MAL unrated) as null', () => {
    expect(mapMalScore(0)).toBeNull();
  });

  it('rejects non-numeric and clamps out-of-range', () => {
    expect(mapMalScore(null)).toBeNull();
    expect(mapMalScore(undefined)).toBeNull();
    expect(mapMalScore(NaN)).toBeNull();
    expect(mapMalScore(12)).toBe(5); // clamp high
    expect(mapMalScore(-3)).toBeNull(); // below 1 is "unrated"
  });
});

describe('parseMalYear', () => {
  it('expands 2-digit years using a 1960 pivot', () => {
    expect(parseMalYear('10-20-99')).toBe(1999);
    expect(parseMalYear('04-01-23')).toBe(2023);
    expect(parseMalYear('01-01-60')).toBe(1960);
    expect(parseMalYear('01-01-59')).toBe(2059);
  });

  it('returns null for unparseable input', () => {
    expect(parseMalYear('')).toBeNull();
    expect(parseMalYear(null)).toBeNull();
    expect(parseMalYear('2023-04-01')).toBeNull();
    expect(parseMalYear('abc')).toBeNull();
  });
});

describe('toImportPayload', () => {
  const base = {
    anime_id: 21,
    status: 2,
    score: 9,
    num_watched_episodes: 623,
    anime_title: 'One Piece',
    anime_num_episodes: 0,
    anime_airing_status: 1,
    anime_media_type_string: 'TV',
    anime_image_path: 'https://cdn.example/poster.jpg',
    anime_start_date_string: '10-20-99',
    genres: [
      { id: 1, name: 'Action' },
      { id: 2, name: 'Adventure' },
    ],
  };

  it('produces a record shaped for useMyList.addItem', () => {
    const payload = toImportPayload(base);
    expect(payload).toMatchObject({
      anime: {
        id: 21,
        mal_id: 21,
        title: 'One Piece',
        image: 'https://cdn.example/poster.jpg',
        episodes: 0,
        type: 'TV',
        airing: true,
        year: 1999,
        genres: ['Action', 'Adventure'],
      },
      options: {
        status: 'completed',
        progress: 623,
        rating: 4.5,
      },
    });
  });

  it('drops rating when MAL score is 0 (unrated)', () => {
    const payload = toImportPayload({ ...base, score: 0 });
    expect(payload.options.rating).toBeUndefined();
  });

  it('returns null for unsupported MAL status', () => {
    expect(toImportPayload({ ...base, status: 5 })).toBeNull();
  });

  it('returns null when anime_id is missing', () => {
    expect(toImportPayload({ ...base, anime_id: null })).toBeNull();
    expect(toImportPayload({})).toBeNull();
    expect(toImportPayload(null)).toBeNull();
  });

  it('falls back to English title when primary is missing', () => {
    const payload = toImportPayload({
      ...base,
      anime_title: '',
      anime_title_eng: 'One Piece (English)',
    });
    expect(payload.anime.title).toBe('One Piece (English)');
  });

  it('handles string genre entries gracefully', () => {
    const payload = toImportPayload({ ...base, genres: ['Action', null, 'Drama'] });
    expect(payload.anime.genres).toEqual(['Action', 'Drama']);
  });
});

describe('summarizeImport', () => {
  const makeItem = (overrides) => ({
    anime_id: 1,
    status: 2,
    score: 7,
    num_watched_episodes: 12,
    anime_title: 'Test',
    anime_num_episodes: 12,
    anime_airing_status: 2,
    anime_media_type_string: 'TV',
    ...overrides,
  });

  it('groups supported items by status and counts skips', () => {
    const summary = summarizeImport([
      makeItem({ anime_id: 1, status: 1 }),
      makeItem({ anime_id: 2, status: 2 }),
      makeItem({ anime_id: 3, status: 2 }), // will be skipped
      makeItem({ anime_id: 4, status: 6 }),
      makeItem({ anime_id: 5, status: 5 }), // unsupported
    ], new Set(['3']));
    expect(summary).toMatchObject({
      total: 3,
      skipped: 1,
      unsupported: 1,
      byStatus: {
        watching: 1,
        completed: 1,
        on_hold: 0,
        dropped: 0,
        plan: 1,
      },
    });
  });

  it('counts ratings only for items that will actually be imported', () => {
    const summary = summarizeImport([
      makeItem({ anime_id: 1, score: 8 }),
      makeItem({ anime_id: 2, score: 0 }), // no rating
      makeItem({ anime_id: 3, score: 10 }),
    ]);
    expect(summary.withRating).toBe(2);
  });

  it('handles non-array input safely', () => {
    expect(summarizeImport(null).total).toBe(0);
    expect(summarizeImport(undefined).total).toBe(0);
  });
});

describe('favoriteAnimeIds', () => {
  it('returns a set of numeric mal_ids', () => {
    const set = favoriteAnimeIds([
      { mal_id: 1, title: 'Cowboy Bebop' },
      { mal_id: 20, title: 'Naruto' },
    ]);
    expect(set.has(1)).toBe(true);
    expect(set.has(20)).toBe(true);
    expect(set.size).toBe(2);
  });

  it('drops invalid entries', () => {
    const set = favoriteAnimeIds([
      { mal_id: 1 },
      { mal_id: null },
      { mal_id: 'abc' },
      null,
    ]);
    expect(set.size).toBe(1);
  });

  it('handles non-array input', () => {
    expect(favoriteAnimeIds(null).size).toBe(0);
    expect(favoriteAnimeIds(undefined).size).toBe(0);
  });
});

describe('toFavoriteCharacterPayload', () => {
  const base = {
    mal_id: 1,
    name: 'Spiegel, Spike',
    name_kanji: 'スパイク',
    images: {
      webp: { image_url: 'https://cdn.example/char.webp' },
      jpg: { image_url: 'https://cdn.example/char.jpg' },
    },
  };

  it('produces the Firestore write shape', () => {
    expect(toFavoriteCharacterPayload(base)).toEqual({
      id: '1',
      malId: 1,
      name: 'Spiegel, Spike',
      nameKanji: 'スパイク',
      imageUrl: 'https://cdn.example/char.webp',
    });
  });

  it('prefers webp but falls back to jpg', () => {
    const payload = toFavoriteCharacterPayload({
      ...base,
      images: { jpg: { image_url: 'https://cdn.example/fallback.jpg' } },
    });
    expect(payload.imageUrl).toBe('https://cdn.example/fallback.jpg');
  });

  it('returns null for unusable entries', () => {
    expect(toFavoriteCharacterPayload(null)).toBeNull();
    expect(toFavoriteCharacterPayload({ mal_id: 0, name: 'x' })).toBeNull();
    expect(toFavoriteCharacterPayload({ mal_id: 1, name: '' })).toBeNull();
    expect(toFavoriteCharacterPayload({ mal_id: 1 })).toBeNull();
  });
});

describe('planFavoriteImport', () => {
  const animeFavorites = [{ mal_id: 1 }, { mal_id: 20 }, { mal_id: 30 }];
  const characterFavorites = [
    { mal_id: 1, name: 'Spike' },
    { mal_id: 2, name: 'Asuka' },
    { mal_id: 3, name: 'Kenshiro' },
  ];

  it('only flags anime favourites that are actually imported', () => {
    const plan = planFavoriteImport({
      animeFavorites,
      characterFavorites: [],
      importedAnimeIds: new Set(['1', '20']), // 30 isn't imported
      existingAnimeFavCount: 0,
      existingCharFavIds: new Set(),
      existingCharFavCount: 0,
      limit: 10,
    });
    expect(plan.animeFavoriteIds.has('1')).toBe(true);
    expect(plan.animeFavoriteIds.has('20')).toBe(true);
    expect(plan.animeFavoriteIds.has('30')).toBe(false);
    expect(plan.animeFavoriteIds.size).toBe(2);
    expect(plan.skippedAnime).toBe(1);
  });

  it('caps anime favourites at remaining slots (limit minus existing)', () => {
    const plan = planFavoriteImport({
      animeFavorites,
      characterFavorites: [],
      importedAnimeIds: new Set(['1', '20', '30']),
      existingAnimeFavCount: 8, // only 2 slots left
      existingCharFavIds: new Set(),
      existingCharFavCount: 0,
      limit: 10,
    });
    expect(plan.animeFavoriteIds.size).toBe(2);
    expect(plan.skippedAnime).toBe(1);
  });

  it('skips character favourites already on file and caps by slot count', () => {
    const plan = planFavoriteImport({
      animeFavorites: [],
      characterFavorites,
      importedAnimeIds: new Set(),
      existingAnimeFavCount: 0,
      existingCharFavIds: new Set(['2']), // Asuka already favourited
      existingCharFavCount: 9, // only 1 slot left
      limit: 10,
    });
    // Only 1 slot; Asuka is skipped as duplicate; Spike comes first and fills it
    expect(plan.characters).toHaveLength(1);
    expect(plan.characters[0].id).toBe('1');
    expect(plan.skippedChars).toBe(2);
  });
});
