const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Jikan enforces ~3 req/sec and returns 429 on overflow. Respect `Retry-After`
// when present, otherwise exponential backoff capped at 4 attempts.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      if (!response.ok) return fallback;
      return await response.json();
    } catch {
      if (attempt === MAX_RETRIES) return fallback;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
  return fallback;
};

export const getCurrentSeason = () =>
  fetchJikan('/seasons/now', { data: [], pagination: {}, error: true });

export const getTopAnimeMovies = () =>
  fetchJikan('/top/anime?type=movie', { data: [], pagination: {}, error: true });

export const getSeasonByYear = (year, season) =>
  fetchJikan(`/seasons/${year}/${season}`, { data: [], pagination: {}, error: true });

export const getAnimeById = (id) => fetchJikan(`/anime/${id}`, { data: null, error: true });

export const getAnimeCharacters = (id) =>
  fetchJikan(`/anime/${id}/characters`, { data: [], error: true });

export const getCharacterById = (id) =>
  fetchJikan(`/characters/${id}`, { data: null, error: true });

export const getCharacterAnime = (id) =>
  fetchJikan(`/characters/${id}/anime`, { data: [], error: true });

export const getCharacterVoices = (id) =>
  fetchJikan(`/characters/${id}/voices`, { data: [], error: true });

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
  return fetchJikan(`/schedules${suffix}`, { data: [], pagination: {}, error: true });
};

// Characters browse
export const getTopCharacters = (page = 1) =>
  fetchJikan(`/top/characters?page=${page}&limit=24`, { data: [], pagination: {}, error: true });

// People (voice actors)
export const getTopPeople = (page = 1) =>
  fetchJikan(`/top/people?page=${page}&limit=24`, { data: [], pagination: {}, error: true });

export const getPersonById = (id) => fetchJikan(`/people/${id}`, { data: null, error: true });

export const getPersonAnime = (id) =>
  fetchJikan(`/people/${id}/anime`, { data: [], error: true });

export const getPersonVoices = (id) =>
  fetchJikan(`/people/${id}/voices`, { data: [], error: true });

// Producers / studios
export const getProducers = (page = 1) =>
  fetchJikan(`/producers?page=${page}&order_by=favorites&sort=desc&limit=24`, {
    data: [],
    pagination: {},
    error: true,
  });

export const getProducerById = (id) =>
  fetchJikan(`/producers/${id}/full`, { data: null, error: true });

export const getAnimeByProducer = (id, page = 1) =>
  fetchJikan(`/anime?producers=${id}&page=${page}&order_by=score&sort=desc&limit=24`, {
    data: [],
    pagination: {},
    error: true,
  });

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
