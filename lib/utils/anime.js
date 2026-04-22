import { getAnimeImageUrl } from './media';

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

// Jikan occasionally returns the same mal_id more than once in a single
// response — most visibly on `/schedules/{day}`, where a show with multiple
// broadcast rows (e.g. schedule changes, re-runs, simulcast on more than
// one channel) is serialised as separate entries even though it's the same
// anime. Apply this right after `filterOutHentai` to keep grids from
// rendering the same card three times in a row.
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
