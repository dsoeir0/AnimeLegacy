import { MISS, peek, put } from './_cache';

// Jikan-shaped lists sourced from AniList, used only when Jikan is down so
// the home page and /seasons never render empty. Items without a MAL id are
// dropped: every card links to /anime/{mal_id}.

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const FETCH_TIMEOUT_MS = 8000;
const TTL_MS = 30 * 60 * 1000;

const MEDIA_FIELDS = `
  idMal
  title { romaji english }
  description(asHtml: false)
  format
  status
  episodes
  duration
  averageScore
  popularity
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  coverImage { extraLarge large }
  genres
  studios(isMain: true) { nodes { name } }
`;

const SEASON_QUERY = `
  query ($season: MediaSeason, $year: Int, $page: Int) {
    Page(page: $page, perPage: 50) {
      media(season: $season, seasonYear: $year, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const TOP_MOVIES_QUERY = `
  query {
    Page(page: 1, perPage: 24) {
      media(format: MOVIE, type: ANIME, isAdult: false, sort: SCORE_DESC) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const FORMAT_TO_TYPE = {
  TV: 'TV',
  TV_SHORT: 'TV',
  MOVIE: 'Movie',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Special',
  MUSIC: 'Music',
};

const STATUS_TO_JIKAN = {
  RELEASING: 'Currently Airing',
  FINISHED: 'Finished Airing',
  NOT_YET_RELEASED: 'Not yet aired',
};

const toIsoDate = (date) => {
  if (!date?.year) return null;
  const month = String(date.month || 1).padStart(2, '0');
  const day = String(date.day || 1).padStart(2, '0');
  return `${date.year}-${month}-${day}T00:00:00+00:00`;
};

const stripHtml = (text) =>
  typeof text === 'string'
    ? text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    : null;

export const aniListMediaToJikan = (media) => {
  if (!media?.idMal) return null;
  const cover = media.coverImage?.extraLarge || media.coverImage?.large || null;
  const images = { image_url: cover, large_image_url: cover };
  return {
    mal_id: media.idMal,
    title: media.title?.romaji || media.title?.english || '',
    title_english: media.title?.english || null,
    synopsis: stripHtml(media.description),
    type: FORMAT_TO_TYPE[media.format] || media.format || null,
    episodes: media.episodes ?? null,
    score: typeof media.averageScore === 'number' ? media.averageScore / 10 : null,
    members: media.popularity ?? null,
    season: media.season ? media.season.toLowerCase() : null,
    year: media.seasonYear || media.startDate?.year || null,
    duration: media.duration ? `${media.duration} min per ep` : null,
    status: STATUS_TO_JIKAN[media.status] || null,
    airing: media.status === 'RELEASING',
    aired: { from: toIsoDate(media.startDate), to: toIsoDate(media.endDate) },
    genres: (media.genres || []).map((name) => ({ name })),
    studios: (media.studios?.nodes || []).map(({ name }) => ({ name })),
    images: { jpg: images, webp: images },
  };
};

const queryAniList = async (key, query, variables) => {
  const hit = peek(key);
  if (hit !== MISS) return hit;
  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { data: [], pagination: {}, error: true };
    const payload = await response.json();
    const data = (payload?.data?.Page?.media || []).map(aniListMediaToJikan).filter(Boolean);
    if (!data.length) return { data: [], pagination: {}, error: true };
    const result = { data, pagination: {} };
    put(key, TTL_MS, result);
    return result;
  } catch {
    return { data: [], pagination: {}, error: true };
  }
};

export const getAniListSeason = (year, season) =>
  queryAniList(`anilist:fallback:season:${year}:${season}`, SEASON_QUERY, {
    year: Number(year),
    season: String(season).toUpperCase(),
    page: 1,
  });

export const getAniListTopMovies = () =>
  queryAniList('anilist:fallback:top-movies', TOP_MOVIES_QUERY, {});
