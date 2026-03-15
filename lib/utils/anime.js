import { getAnimeImageUrl } from './media'

export const normalizeAnime = (anime) => {
  if (!anime) return null
  const id = anime.mal_id ?? anime.id
  if (!id) return null
  return {
    id,
    title: anime.title || anime.title_english || 'Untitled',
    image: getAnimeImageUrl(anime),
    score: anime.score ?? null,
    type: anime.type || anime.format || 'Series',
    episodes: anime.episodes ?? null,
    year: anime.year || anime?.aired?.prop?.from?.year || null,
  }
}
