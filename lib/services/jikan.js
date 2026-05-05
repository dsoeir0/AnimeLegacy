import { getSeasonFromDate } from '../utils/season';
import { MISS, peek, put } from './_cache';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Retry policy varies by failure mode:
//   429 — rate-limited, retry up to MAX_RETRIES with backoff + Retry-After
//   5xx — upstream infra hiccup, retry ONCE then bail
//   200 with error envelope — Jikan already exhausted its internal retries
//                             before serialising this, so don't retry again
//
// Earlier the code retried 4× on 5xx with exponential backoff — nice in
// theory, but during a real Jikan outage it added ~4s of latency per broken
// endpoint to the home page SSR. Fail-fast is better UX: empty carousel now,
// retry on the next request.
const MAX_RETRIES = 3;
const RETRY_5XX_LIMIT = 1;
const BASE_DELAY_MS = 600;

// TTLs by endpoint kind. Tuned to balance freshness vs Jikan rate-limit
// pressure. Search is excluded — every query is unique and caching it
// would just bloat memory without meaningful hit rate.
const TTL = {
  anime: 60 * 60 * 1000,          // 1h — metadata is stable
  topAnime: 15 * 60 * 1000,       // 15m — popularity shifts
  season: 60 * 60 * 1000,         // 1h — lineups are fixed once published
  schedules: 5 * 60 * 1000,       // 5m — broadcast times can change
  character: 60 * 60 * 1000,      // 1h — bios are stable
  people: 60 * 60 * 1000,         // 1h — bios are stable
  producers: 60 * 60 * 1000,      // 1h — studio catalogue changes slowly
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cache wrapper specific to Jikan: only caches successful responses. The
// earlier design used the generic `cached()` helper and wound up caching the
// `{ error: true }` fallback when Jikan 429'd — which meant a single rate-
// limit hit blanked out the home page's carousels for the whole TTL. Now
// error responses are returned to the caller as before (so `getServerSideProps`
// can still catch and render an empty state) but never written to the cache,
// so the next visit actually retries instead of serving stale emptiness.
const cachedJikan = async (key, ttlMs, path, fallback) => {
  const hit = peek(key);
  if (hit !== MISS) return hit;
  const result = await fetchJikan(path, fallback);
  if (!result?.error) put(key, ttlMs, result);
  return result;
};

// Jikan sometimes wraps a 5xx in a 200 response body — their REST gateway
// serialises the upstream exception into JSON instead of propagating the
// status code. Detect both shapes: real HTTP errors and these envelopes.
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
      // Enveloped error: Jikan already retried internally before serialising
      // this into JSON. Retrying from our side just delays the user's page.
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
  // Primary: the shortcut endpoint. Cached independently so its hit rate
  // isn't polluted when we fall back.
  const direct = await cachedJikan('jikan:season:now', TTL.season, '/seasons/now', {
    data: [],
    pagination: {},
    error: true,
  });
  if (!direct?.error) return direct;

  // Fallback: Jikan's MongoDB shards are sometimes partitioned — `/seasons/now`
  // fails while `/seasons/{year}/{season}` (same data, different code path)
  // still works. Route around the outage so the home page keeps its hero.
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
    24 * 60 * 60 * 1000, // 24h — the genre taxonomy barely changes
    '/genres/anime?filter=genres',
    { data: [], error: true },
  );

// Anime listing filtered by an opaque Jikan query string. Used by the
// discover page when a genre or mood is active. The `params` string
// already carries whatever combination of filters we need (genres=1,
// type=movie, order_by=score, …) so this wrapper stays dumb — the mood
// taxonomy in `components/discover/moods.js` owns the semantics.
export const getAnimeByFilter = ({ params, page = 1 }) =>
  cachedJikan(
    `jikan:anime-filter:${params}:${page}`,
    TTL.topAnime,
    `/anime?${params}&page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

export const getSeasonByYear = (year, season) =>
  cachedJikan(`jikan:season:${year}:${season}`, TTL.season, `/seasons/${year}/${season}`, {
    data: [],
    pagination: {},
    error: true,
  });

export const getAnimeById = (id) =>
  cachedJikan(`jikan:anime:${id}`, TTL.anime, `/anime/${id}`, { data: null, error: true });

export const getAnimeCharacters = (id) =>
  cachedJikan(`jikan:anime:${id}:characters`, TTL.anime, `/anime/${id}/characters`, {
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

// Search is intentionally NOT cached: every query is unique and user-facing,
// and caching misses would just burn memory. If we ever introduce autocomplete
// with a fixed popular-query set, that narrow set could be cached separately.
export const searchAnime = (query, page = 1, limit = 21) => {
  const safeQuery = encodeURIComponent(query || '');
  return fetchJikan(
    `/anime?q=${safeQuery}&page=${page}&limit=${limit}&order_by=score&sort=desc`,
    { data: [], pagination: {}, error: true },
  );
};

// Calendar
export const getSchedules = (day) => {
  const suffix = day ? `?filter=${day}` : '';
  return cachedJikan(`jikan:schedules:${day || 'all'}`, TTL.schedules, `/schedules${suffix}`, {
    data: [],
    pagination: {},
    error: true,
  });
};

// Characters browse
export const getTopCharacters = (page = 1) =>
  cachedJikan(
    `jikan:top:characters:${page}`,
    TTL.character,
    `/top/characters?page=${page}&limit=24`,
    { data: [], pagination: {}, error: true },
  );

// People (voice actors)
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

// Producers / studios
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
