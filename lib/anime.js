export const normalizeAnime = (anime) => {
  if (!anime) return null
  const id = anime.mal_id ?? anime.id
  if (!id) return null
  return {
    id,
    title: anime.title || anime.title_english || 'Untitled',
    image:
      anime?.images?.webp?.large_image_url ||
      anime?.images?.jpg?.large_image_url ||
      anime?.images?.webp?.image_url ||
      anime?.images?.jpg?.image_url ||
      anime?.image ||
      '',
    score: anime.score ?? null,
    type: anime.type || anime.format || 'Series',
    episodes: anime.episodes ?? null,
    year: anime.year || anime?.aired?.prop?.from?.year || null,
  }
}
