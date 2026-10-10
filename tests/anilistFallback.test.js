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
    expect(body.variables).toEqual({ year: 2023, season: 'FALL', page: 1 });
  });

  it('reports an error (uncached) when AniList fails', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false }));
    const { getAniListSeason } = await import('../lib/services/anilistFallback');
    expect((await getAniListSeason(2023, 'fall')).error).toBe(true);
    await getAniListSeason(2023, 'fall');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
