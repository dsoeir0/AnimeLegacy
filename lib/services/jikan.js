const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const fetchJikan = async (path, fallback) => {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`Jikan request failed: ${response.status}`);
    }
    return await response.json();
  } catch {
    return fallback;
  }
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

export const slimAnimeFields = (item) => ({
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
