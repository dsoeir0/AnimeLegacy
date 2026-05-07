import {
  getAnimeById,
  getAnimeByFilter,
  getAnimeRecommendations,
} from '../../lib/services/jikan';
import { filterOutHentai } from '../../lib/utils/anime';

const slim = (item) => ({
  mal_id: item.mal_id,
  title: item.title || '',
  images: item.images || null,
  genres: Array.isArray(item.genres)
    ? item.genres.map((g) => ({ mal_id: g?.mal_id ?? null, name: g?.name || '' }))
    : [],
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const [animeRes, recsRes] = await Promise.all([
      getAnimeById(id),
      getAnimeRecommendations(id),
    ]);

    const genreIds = Array.isArray(animeRes?.data?.genres)
      ? animeRes.data.genres
          .map((g) => Number(g?.mal_id))
          .filter((n) => Number.isFinite(n))
          .slice(0, 2)
      : [];

    const recsItems = Array.isArray(recsRes?.data)
      ? recsRes.data.map((r) => r?.entry).filter(Boolean)
      : [];

    let topByGenre = [];
    if (genreIds.length > 0) {
      const filterRes = await getAnimeByFilter({
        params: `genres=${genreIds.join(',')}&order_by=score&sort=desc`,
        page: 1,
      });
      topByGenre = Array.isArray(filterRes?.data)
        ? filterOutHentai(filterRes.data)
        : [];
    }

    const seen = new Set([id]);
    const merged = [];
    for (const item of [...recsItems, ...topByGenre]) {
      if (!Number.isFinite(item?.mal_id) || seen.has(item.mal_id)) continue;
      seen.add(item.mal_id);
      merged.push(slim(item));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ data: merged.slice(0, 40) });
  } catch (err) {
    console.error('anime-recs failed:', err);
    return res.status(502).json({ error: 'Recommendations unavailable' });
  }
}
