import { getSeasonFromDate } from '../utils/season';
import { MISS, peek, put } from './_cache';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const MAX_RETRIES = 3;
const RETRY_5XX_LIMIT = 1;
const BASE_DELAY_MS = 600;

const TTL = {
  anime: 60 * 60 * 1000,
  topAnime: 15 * 60 * 1000,
  season: 60 * 60 * 1000,
  schedules: 5 * 60 * 1000,
  character: 60 * 60 * 1000,
  people: 60 * 60 * 1000,
  producers: 60 * 60 * 1000,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const inflight = new Map();

const cachedJikan = async (key, ttlMs, path, fallback) => {
  const hit = peek(key);
  if (hit !== MISS) return hit;
  let promise = inflight.get(key);
  if (!promise) {
    promise = (async () => {
      const result = await fetchJikan(path, fallback);
      if (!result?.error) put(key, ttlMs, result);
      return result;
    })();
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
  }
  return promise;
};

const isEnvelopedError = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.status === 'number' && payload.status >= 400) return true;
  if (typeof payload.error === 'string' && payload.error.length > 0) return true;
  return false;
};

const fetchJikan = async (path, fallback) => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${JIKAN_BASE_URL}${path}`);

      if (response.status === 429) {
        if (attempt === MAX_RETRIES) return fallback;
        const retryAfter = Number(response.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : BASE_DELAY_MS * 2 ** attempt;
        await sleep(wait);
        continue;
      }

      if (response.status >= 500) {
        if (attempt >= RETRY_5XX_LIMIT) return fallback;
        await sleep(BASE_DELAY_MS);
        continue;
      }

      if (!response.ok) return fallback;

      const payload = await response.json();
      if (isEnvelopedError(payload)) return fallback;

      return payload;
    } catch {
      if (attempt === MAX_RETRIES) return fallback;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
  return fallback;
};

export const getCurrentSeason = async () => {
  const direct = await cachedJikan('jikan:season:now', TTL.season, '/seasons/now', {
    data: [],
    pagination: {},
    error: true,
  });
  if (!direct?.error) return direct;

  const year = new Date().getFullYear();
  const season = getSeasonFromDate();
  return getSeasonByYear(year, season);
};

export const getTopAnimeMovies = (page = 1) =>
  cachedJikan(
    `jikan:top:movies:${page}`,
    TTL.topAnime,
    `/top/anime?type=movie&page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

export const getTopAnime = (filter = '', page = 1) =>
  cachedJikan(
    `jikan:top:anime:${filter}:${page}`,
    TTL.topAnime,
    `/top/anime?${filter ? `filter=${filter}&` : ''}page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

export const getAnimeGenres = () =>
  cachedJikan(
    'jikan:genres:anime',
    24 * 60 * 60 * 1000,
    '/genres/anime?filter=genres',
    { data: [], error: true },
  );

export const getAnimeByFilter = ({ params, page = 1 }) =>
  cachedJikan(
    `jikan:anime-filter:${params}:${page}`,
    TTL.topAnime,
    `/anime?${params}&page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

const getSeasonByYear = (year, season) =>
  cachedJikan(`jikan:season:${year}:${season}`, TTL.season, `/seasons/${year}/${season}`, {
    data: [],
    pagination: {},
    error: true,
  });

const getSeasonByYearPage = (year, season, page) =>
  cachedJikan(
    `jikan:season:${year}:${season}:p${page}`,
    TTL.season,
    `/seasons/${year}/${season}?page=${page}`,
    { data: [], pagination: {}, error: true },
  );

const SEASON_PAGE_CAP = 12;

export const getSeasonByYearAll = async (year, season) => {
  const first = await getSeasonByYearPage(year, season, 1);
  if (first?.error) return first;
  const lastPage = Number(first?.pagination?.last_visible_page) || 1;
  const totalPages = Math.min(lastPage, SEASON_PAGE_CAP);
  if (totalPages <= 1) return first;
  const aggregated = [...first.data];
  let pagination = first.pagination;
  for (let p = 2; p <= totalPages; p += 1) {
    const next = await getSeasonByYearPage(year, season, p);
    if (next?.error) break;
    aggregated.push(...next.data);
    pagination = next.pagination || pagination;
  }
  return { data: aggregated, pagination };
};

export const getAnimeById = (id) =>
  cachedJikan(`jikan:anime:${id}`, TTL.anime, `/anime/${id}`, { data: null, error: true });

export const getAnimeCharacters = (id) =>
  cachedJikan(`jikan:anime:${id}:characters`, TTL.anime, `/anime/${id}/characters`, {
    data: [],
    error: true,
  });

export const getAnimeRecommendations = (id) =>
  cachedJikan(`jikan:anime:${id}:recommendations`, TTL.anime, `/anime/${id}/recommendations`, {
    data: [],
    error: true,
  });

export const getAnimeRelations = (id) =>
  cachedJikan(`jikan:anime:${id}:relations`, TTL.anime, `/anime/${id}/relations`, {
    data: [],
    error: true,
  });

export const getCharacterById = (id) =>
  cachedJikan(`jikan:character:${id}`, TTL.character, `/characters/${id}`, {
    data: null,
    error: true,
  });

export const getCharacterAnime = (id) =>
  cachedJikan(`jikan:character:${id}:anime`, TTL.character, `/characters/${id}/anime`, {
    data: [],
    error: true,
  });

export const getCharacterVoices = (id) =>
  cachedJikan(`jikan:character:${id}:voices`, TTL.character, `/characters/${id}/voices`, {
    data: [],
    error: true,
  });

export const searchAnime = (query, page = 1, limit = 21) => {
  const safeQuery = encodeURIComponent(query || '');
  return fetchJikan(
    `/anime?q=${safeQuery}&page=${page}&limit=${limit}&order_by=score&sort=desc`,
    { data: [], pagination: {}, error: true },
  );
};

export const searchCharacters = (query, page = 1, limit = 5) => {
  const safe = encodeURIComponent(query || '');
  return fetchJikan(
    `/characters?q=${safe}&page=${page}&limit=${limit}&order_by=favorites&sort=desc`,
    { data: [], pagination: {}, error: true },
  );
};

export const searchPeople = (query, page = 1, limit = 5) => {
  const safe = encodeURIComponent(query || '');
  return fetchJikan(
    `/people?q=${safe}&page=${page}&limit=${limit}&order_by=favorites&sort=desc`,
    { data: [], pagination: {}, error: true },
  );
};

export const searchProducers = (query, page = 1, limit = 5) => {
  const safe = encodeURIComponent(query || '');
  return fetchJikan(
    `/producers?q=${safe}&page=${page}&limit=${limit}&order_by=favorites&sort=desc`,
    { data: [], pagination: {}, error: true },
  );
};

export const getSchedules = (day) => {
  const suffix = day ? `?filter=${day}` : '';
  return cachedJikan(`jikan:schedules:${day || 'all'}`, TTL.schedules, `/schedules${suffix}`, {
    data: [],
    pagination: {},
    error: true,
  });
};

export const getTopCharacters = (page = 1) =>
  cachedJikan(
    `jikan:top:characters:${page}`,
    TTL.character,
    `/top/characters?page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

export const getTopPeople = (page = 1) =>
  cachedJikan(
    `jikan:top:people:${page}`,
    TTL.people,
    `/top/people?page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

export const getPersonById = (id) =>
  cachedJikan(`jikan:person:${id}`, TTL.people, `/people/${id}`, { data: null, error: true });

export const getPersonAnime = (id) =>
  cachedJikan(`jikan:person:${id}:anime`, TTL.people, `/people/${id}/anime`, {
    data: [],
    error: true,
  });

export const getPersonVoices = (id) =>
  cachedJikan(`jikan:person:${id}:voices`, TTL.people, `/people/${id}/voices`, {
    data: [],
    error: true,
  });

export const getProducers = (page = 1) =>
  cachedJikan(
    `jikan:producers:${page}`,
    TTL.producers,
    `/producers?page=${page}&order_by=favorites&sort=desc&limit=24`,
    { data: [], pagination: {}, error: true },
  );

export const getProducerById = (id) =>
  cachedJikan(`jikan:producer:${id}`, TTL.producers, `/producers/${id}/full`, {
    data: null,
    error: true,
  });

export const getAnimeByProducer = (id, page = 1) =>
  cachedJikan(
    `jikan:producer:${id}:anime:${page}`,
    TTL.producers,
    `/anime?producers=${id}&page=${page}&order_by=score&sort=desc&limit=24`,
    { data: [], pagination: {}, error: true },
  );

const slimAnimeFields = (item) => ({
  mal_id: item?.mal_id,
  title: item?.title,
  synopsis: item?.synopsis,
  type: item?.type,
  episodes: item?.episodes,
  score: item?.score,
  year: item?.year,
  duration: item?.duration,
  aired: item?.aired,
  images: {
    webp: {
      image_url: item?.images?.webp?.image_url,
      large_image_url: item?.images?.webp?.large_image_url,
    },
    jpg: {
      image_url: item?.images?.jpg?.image_url,
      large_image_url: item?.images?.jpg?.large_image_url,
    },
  },
});

export const slimAnimeResponse = (response) => ({
  data: Array.isArray(response?.data) ? response.data.map(slimAnimeFields) : [],
});
