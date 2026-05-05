import { getAnimeImageUrl } from './media';
import { getSeasonFromDate } from './season';

export const normalizeAnime = (anime) => {
  if (!anime) return null;
  const id = anime.mal_id ?? anime.id;
  if (!id) return null;
  return {
    id,
    title: anime.title || anime.title_english || 'Untitled',
    image: getAnimeImageUrl(anime),
    score: anime.score ?? null,
    type: anime.type || anime.format || 'Series',
    episodes: anime.episodes ?? null,
    status: anime.status || null,
    airing: Boolean(anime.airing),
    year: anime.year || anime?.aired?.prop?.from?.year || null,
    season: anime.season || null,
    genres: Array.isArray(anime.genres)
      ? anime.genres.map((entry) => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean)
      : [],
  };
};

export const isAiringAnime = (anime) => {
  if (!anime) return false;
  if (anime.airing === true) return true;
  const status = typeof anime.status === 'string' ? anime.status.toLowerCase() : '';
  if (status.includes('finished')) return false;
  if (status.includes('airing')) return true;
  return false;
};

// Falls back to season+year+type when status/airing fields are missing
// (common in user list entries). Pass sources in priority order.
const pickFirstField = (sources, key) => {
  for (const source of sources) {
    if (!source) continue;
    const value = source[key];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
};

export const isAiringWithSeasonHeuristic = (
  sources,
  { currentSeason, currentYear } = {},
) => {
  const arr = Array.isArray(sources) ? sources : [sources];
  for (const source of arr) {
    if (!source) continue;
    if (source.airing === true) return true;
    if (isAiringAnime(source)) return true;
  }
  const season = currentSeason ?? getSeasonFromDate();
  const year = currentYear ?? new Date().getFullYear();
  const seasonLabel = String(pickFirstField(arr, 'season') ?? '').toLowerCase();
  if (!seasonLabel || seasonLabel !== season) return false;
  const yearVal = Number(pickFirstField(arr, 'year'));
  if (!Number.isFinite(yearVal) || yearVal !== year) return false;
  return String(pickFirstField(arr, 'type') ?? '').toLowerCase().includes('tv');
};

export const isHentaiAnime = (anime) => {
  if (!anime) return false;
  const rating = typeof anime?.rating === 'string' ? anime.rating.toLowerCase() : '';
  if (rating.includes('hentai')) return true;
  const genres = Array.isArray(anime?.genres) ? anime.genres : [];
  const explicitGenres = Array.isArray(anime?.explicit_genres) ? anime.explicit_genres : [];
  const allGenres = [...genres, ...explicitGenres];
  return allGenres.some((genre) => String(genre?.name || '').toLowerCase() === 'hentai');
};

export const filterOutHentai = (items = []) => items.filter((item) => !isHentaiAnime(item));

export const primaryStudioName = (anime) => {
  if (!Array.isArray(anime?.studios) || !anime.studios.length) return '';
  return anime.studios[0]?.name || '';
};

export const slimAnimeForDiscover = (a) => ({
  mal_id: a?.mal_id,
  title: a?.title,
  synopsis: a?.synopsis,
  score: typeof a?.score === 'number' ? a.score : null,
  rank: Number.isFinite(a?.rank) ? a.rank : null,
  year: a?.year || a?.aired?.prop?.from?.year || null,
  aired: a?.aired ? { prop: { from: a.aired.prop?.from || null } } : null,
  type: a?.type || null,
  episodes: Number.isFinite(a?.episodes) ? a.episodes : null,
  duration: a?.duration || null,
  popularity: Number.isFinite(a?.popularity) ? a.popularity : null,
  members: Number.isFinite(a?.members) ? a.members : null,
  genres: Array.isArray(a?.genres)
    ? a.genres.map((g) =>
        typeof g === 'string' ? g : { mal_id: g?.mal_id ?? null, name: g?.name || '' },
      )
    : [],
  studios: Array.isArray(a?.studios)
    ? a.studios.map((s) => ({ mal_id: s?.mal_id ?? null, name: s?.name || '' }))
    : [],
  images: {
    webp: {
      image_url: a?.images?.webp?.image_url || null,
      large_image_url: a?.images?.webp?.large_image_url || null,
    },
    jpg: {
      image_url: a?.images?.jpg?.image_url || null,
      large_image_url: a?.images?.jpg?.large_image_url || null,
    },
  },
});

// `/schedules/{day}` returns the same anime once per broadcast row.
export const dedupeByMalId = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = item?.mal_id;
    if (!id) return true; // no id? keep — nothing to dedupe against
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
