import { getAnimeImageUrl, getAnimeBannerUrl } from './media';

const studioName = (studios) => {
  if (!Array.isArray(studios) || studios.length === 0) return '';
  return studios.map((s) => s?.name).filter(Boolean).join(' / ');
};

const genreNames = (genres) => {
  if (!Array.isArray(genres)) return [];
  return genres.map((g) => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
};

export const toCardShape = (anime, aniListMedia = null) => {
  if (!anime) return null;
  const mal_id = anime.mal_id ?? anime.id;
  const episodes =
    anime.episodes ??
    anime.episodesTotal ??
    anime.episodes_aired ??
    null;
  const year = anime.year || anime?.aired?.prop?.from?.year || null;
  const studios = anime.studio || studioName(anime.studios);
  return {
    id: mal_id,
    mal_id,
    title: anime.title || anime.title_english || 'Untitled',
    jp: anime.title_japanese || anime.jp || '',
    synopsis: anime.synopsis || '',
    studio: studios || '—',
    year,
    season: anime.season || '',
    episodes,
    status: anime.status || '',
    type: anime.type || 'TV',
    score: typeof anime.score === 'number' ? anime.score : Number(anime.score) || 0,
    rank: typeof anime.rank === 'number' ? anime.rank : null,
    genres: genreNames(anime.genres),
    poster: getAnimeImageUrl(anime, aniListMedia) || '/logo_no_text.png',
    banner: getAnimeBannerUrl(anime, aniListMedia) || getAnimeImageUrl(anime, aniListMedia) || '/logo_no_text.png',
    color: anime.color || null,
  };
};
