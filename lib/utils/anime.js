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
    year: anime.year || anime?.aired?.prop?.from?.year || null,
  };
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
