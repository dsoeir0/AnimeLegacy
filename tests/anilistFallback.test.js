import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
global.fetch = fetchMock;

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
});

const media = (overrides = {}) => ({
  idMal: 52991,
  title: { romaji: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End" },
  description: 'An elf mage<br>outlives her party. <i>Quietly.</i>',
  format: 'TV',
  status: 'FINISHED',
  episodes: 28,
  duration: 24,
  averageScore: 91,
  popularity: 500000,
  season: 'FALL',
  seasonYear: 2023,
  startDate: { year: 2023, month: 9, day: 29 },
  endDate: { year: 2024, month: 3, day: 22 },
  coverImage: { extraLarge: 'https://s4.anilist.co/xl.jpg', large: 'https://s4.anilist.co/l.jpg' },
  genres: ['Adventure', 'Drama'],
  studios: { nodes: [{ name: 'Madhouse' }] },
  ...overrides,
});

const respond = (list) =>
  Promise.resolve({ ok: true, json: async () => ({ data: { Page: { media: list } } }) });

describe('aniListMediaToJikan', () => {
  it('maps AniList media onto the Jikan fields the cards read', async () => {
    const { aniListMediaToJikan } = await import('../lib/services/anilistFallback');
    const item = aniListMediaToJikan(media());
    expect(item).toMatchObject({
      mal_id: 52991,
      title: 'Sousou no Frieren',
      type: 'TV',
      episodes: 28,
      score: 9.1,
      season: 'fall',
      year: 2023,
      status: 'Finished Airing',
      airing: false,
      genres: [{ name: 'Adventure' }, { name: 'Drama' }],
      studios: [{ name: 'Madhouse' }],
    });
    expect(item.synopsis).toBe('An elf mage\noutlives her party. Quietly.');
    expect(item.aired.from).toBe('2023-09-29T00:00:00+00:00');
    expect(item.images.webp.large_image_url).toBe('https://s4.anilist.co/xl.jpg');
    expect(item.images.jpg.image_url).toBe('https://s4.anilist.co/xl.jpg');
  });

  it('maps MOVIE to Jikan "Movie" and tolerates missing score/cover', async () => {
    const { aniListMediaToJikan } = await import('../lib/services/anilistFallback');
    const item = aniListMediaToJikan(
      media({ format: 'MOVIE', averageScore: null, coverImage: { large: 'l.jpg' } }),
    );
    expect(item.type).toBe('Movie');
    expect(item.score).toBeNull();
    expect(item.images.jpg.large_image_url).toBe('l.jpg');
  });

  it('drops media without a MAL id (cards link to /anime/{mal_id})', async () => {
    const { aniListMediaToJikan } = await import('../lib/services/anilistFallback');
    expect(aniListMediaToJikan(media({ idMal: null }))).toBeNull();
  });
});

describe('getAniListSeason', () => {
  it('returns Jikan-shaped data and caches it', async () => {
    fetchMock.mockReturnValue(respond([media(), media({ idMal: null })]));
    const { getAniListSeason } = await import('../lib/services/anilistFallback');
    const first = await getAniListSeason(2023, 'fall');
    const second = await getAniListSeason(2023, 'fall');
    expect(first.error).toBeUndefined();
    expect(first.data).toHaveLength(1);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables).toEqual({ year: 2023, season: 'FALL', page: 1, perPage: 50 });
  });

  it('reports an error (uncached) when AniList fails', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false }));
    const { getAniListSeason } = await import('../lib/services/anilistFallback');
    expect((await getAniListSeason(2023, 'fall')).error).toBe(true);
    await getAniListSeason(2023, 'fall');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('jikanFilterToAniList', () => {
  it('translates genre ids, sort, type, status, score and dates', async () => {
    const { jikanFilterToAniList } = await import('../lib/services/anilistFallback');
    expect(
      jikanFilterToAniList(
        'genres=1,41&order_by=score&sort=desc&type=tv&status=airing&min_score=8&start_date=2010-01-01&end_date=2019-12-31',
      ),
    ).toEqual({
      genres: ['Action', 'Thriller'],
      formats: ['TV', 'TV_SHORT'],
      status: 'RELEASING',
      minScore: 79,
      startAfter: 20100100,
      startBefore: 20191232,
      sort: ['SCORE_DESC'],
    });
  });

  it('maps Jikan popularity-ascending (rank) to most popular first', async () => {
    const { jikanFilterToAniList } = await import('../lib/services/anilistFallback');
    expect(jikanFilterToAniList('order_by=popularity&sort=asc').sort).toEqual(['POPULARITY_DESC']);
    expect(jikanFilterToAniList('order_by=title&sort=asc').sort).toEqual(['TITLE_ROMAJI']);
    expect(jikanFilterToAniList('order_by=start_date&sort=desc').sort).toEqual(['START_DATE_DESC']);
  });

  it('refuses filters it cannot express faithfully', async () => {
    const { jikanFilterToAniList } = await import('../lib/services/anilistFallback');
    expect(jikanFilterToAniList('genres=46')).toBeNull();
    expect(jikanFilterToAniList('type=music_video')).toBeNull();
  });
});

describe('toJstBroadcast', () => {
  it('buckets by the JST weekday with a JST HH:MM time', async () => {
    const { toJstBroadcast } = await import('../lib/services/anilistFallback');
    // 2026-10-10T15:30:00Z is Sunday 00:30 in Tokyo.
    expect(toJstBroadcast(Date.UTC(2026, 9, 10, 15, 30) / 1000)).toEqual({
      day: 'sunday',
      time: '00:30',
    });
  });
});

describe('aniListMediaToJikanDetail', () => {
  it('adds the detail-page fields (rank, trailer, studios vs producers)', async () => {
    const { aniListMediaToJikanDetail } = await import('../lib/services/anilistFallback');
    const detail = aniListMediaToJikanDetail(
      media({
        title: { romaji: 'Sousou no Frieren', native: '葬送のフリーレン' },
        source: 'MANGA',
        favourites: 90000,
        trailer: { id: 'abc123', site: 'youtube' },
        rankings: [
          { rank: 2, type: 'RATED', allTime: true },
          { rank: 1, type: 'RATED', allTime: false },
          { rank: 40, type: 'POPULAR', allTime: true },
        ],
        allStudios: {
          edges: [
            { isMain: true, node: { name: 'Madhouse' } },
            { isMain: false, node: { name: 'Aniplex' } },
          ],
        },
      }),
    );
    expect(detail).toMatchObject({
      title_japanese: '葬送のフリーレン',
      rank: 2,
      popularity: 40,
      favorites: 90000,
      source: 'Manga',
      trailer: { embed_url: 'https://www.youtube.com/embed/abc123' },
      studios: [{ name: 'Madhouse' }],
      producers: [{ name: 'Aniplex' }],
    });
    expect(detail.aired.string).toBe('Sep 29, 2023 to Mar 22, 2024');
    expect(detail.genres).toEqual([
      { mal_id: 2, name: 'Adventure' },
      { mal_id: 8, name: 'Drama' },
    ]);
  });
});

describe('getAniListRelations', () => {
  it('groups related anime by Jikan-style relation labels', async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            Media: {
              relations: {
                edges: [
                  { relationType: 'SEQUEL', node: { idMal: 2, type: 'ANIME', title: { romaji: 'S2' } } },
                  { relationType: 'SIDE_STORY', node: { idMal: 3, type: 'ANIME', title: { romaji: 'OVA' } } },
                  { relationType: 'ADAPTATION', node: { idMal: null, type: 'MANGA', title: { romaji: 'M' } } },
                ],
              },
            },
          },
        }),
      }),
    );
    const { getAniListRelations } = await import('../lib/services/anilistFallback');
    expect((await getAniListRelations(1)).data).toEqual([
      { relation: 'Sequel', entry: [{ mal_id: 2, type: 'anime', name: 'S2' }] },
      { relation: 'Side Story', entry: [{ mal_id: 3, type: 'anime', name: 'OVA' }] },
    ]);
  });
});

describe('jikan getters fall back to AniList', () => {
  it('getAnimeById serves AniList data when Jikan errors', async () => {
    fetchMock.mockImplementation((url) =>
      String(url).includes('jikan')
        ? Promise.resolve({ ok: false, status: 404, headers: new Headers() })
        : Promise.resolve({ ok: true, json: async () => ({ data: { Media: media() } }) }),
    );
    const { getAnimeById } = await import('../lib/services/jikan');
    const res = await getAnimeById(52991);
    expect(res.error).toBeUndefined();
    expect(res.data.mal_id).toBe(52991);
  });

  it('keeps the Jikan error when AniList fails too', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 404, headers: new Headers() }),
    );
    const { getAnimeById } = await import('../lib/services/jikan');
    expect((await getAnimeById(1)).error).toBe(true);
  });
});

describe('AniList rate limiting', () => {
  it('stops calling AniList after a 429 until Retry-After passes', async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({ ok: false, status: 429, headers: new Headers({ 'retry-after': '30' }) }),
    );
    const { getAniListSeason, getAniListTopMovies } = await import('../lib/services/anilistFallback');
    expect((await getAniListSeason(2023, 'fall')).error).toBe(true);
    expect((await getAniListTopMovies()).error).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves the last good result once it expires and AniList fails', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockReturnValueOnce(respond([media()]));
      const { getAniListSeason } = await import('../lib/services/anilistFallback');
      const good = await getAniListSeason(2023, 'fall');
      vi.advanceTimersByTime(31 * 60 * 1000);
      fetchMock.mockReturnValueOnce(Promise.resolve({ ok: false, status: 500 }));
      expect(await getAniListSeason(2023, 'fall')).toBe(good);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getAniListSchedules', () => {
  const slot = (idMal, airingAt) => ({ airingAt, media: media({ idMal }) });
  const schedulePage = (slots, hasNextPage) =>
    Promise.resolve({
      ok: true,
      json: async () => ({ data: { Page: { pageInfo: { hasNextPage }, airingSchedules: slots } } }),
    });
  // Saturday 2026-10-10 16:00 JST and Sunday 2026-10-11 00:30 JST.
  const SAT = Date.UTC(2026, 9, 10, 7, 0) / 1000;
  const SUN = Date.UTC(2026, 9, 10, 15, 30) / 1000;

  it('pages through the week and buckets by JST weekday', async () => {
    fetchMock
      .mockReturnValueOnce(schedulePage([slot(1, SAT)], true))
      .mockReturnValueOnce(schedulePage([slot(2, SUN)], false));
    const { getAniListSchedules } = await import('../lib/services/anilistFallback');
    const saturday = await getAniListSchedules('saturday');
    const sunday = await getAniListSchedules('sunday');
    expect(saturday.data.map((a) => a.mal_id)).toEqual([1]);
    expect(saturday.data[0].broadcast).toEqual({ day: 'Saturdays', time: '16:00', timezone: 'Asia/Tokyo' });
    expect(sunday.data[0].broadcast.time).toBe('00:30');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a week that lost a page only briefly', async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockReturnValueOnce(schedulePage([slot(1, SAT)], true))
        .mockReturnValueOnce(Promise.resolve({ ok: false, status: 500 }))
        .mockReturnValueOnce(schedulePage([slot(1, SAT), slot(2, SUN)], false));
      const { getAniListSchedules } = await import('../lib/services/anilistFallback');
      expect((await getAniListSchedules('sunday')).data).toHaveLength(0);
      vi.advanceTimersByTime(3 * 60 * 1000);
      expect((await getAniListSchedules('sunday')).data).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('toPagination', () => {
  it('uses the real totals below the AniList cap', async () => {
    const { toPagination } = await import('../lib/services/anilistFallback');
    expect(
      toPagination({ total: 30, perPage: 21, currentPage: 1, lastPage: 2, hasNextPage: true }, 18),
    ).toEqual({
      last_visible_page: 2,
      has_next_page: true,
      current_page: 1,
      items: { count: 18, total: 30, per_page: 21 },
    });
  });

  it('only promises the next page when the total is capped at 5000', async () => {
    const { toPagination } = await import('../lib/services/anilistFallback');
    const capped = toPagination(
      { total: 5000, perPage: 21, currentPage: 3, lastPage: 239, hasNextPage: true },
      20,
    );
    expect(capped.last_visible_page).toBe(4);
    expect(capped.items.total).toBe(84);
    expect(
      toPagination({ total: 5000, perPage: 21, currentPage: 3, lastPage: 239, hasNextPage: false }, 5)
        .last_visible_page,
    ).toBe(3);
  });
});
