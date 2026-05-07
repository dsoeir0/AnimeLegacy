import { getAnimeByProducer } from '../../lib/services/jikan';
import { filterOutHentai } from '../../lib/utils/anime';
import { classifyProducerRole } from '../../lib/utils/studio';

const slimAnime = (a) => ({
  mal_id: a?.mal_id,
  title: a?.title,
  score: typeof a?.score === 'number' ? a.score : null,
  images: {
    webp: { image_url: a?.images?.webp?.image_url || null },
    jpg: { image_url: a?.images?.jpg?.image_url || null },
  },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ items: [] });
  }

  const id = Number.parseInt(req.query.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ items: [] });
  }
  const limit = Math.min(
    Math.max(1, Number.parseInt(req.query.limit, 10) || 4),
    8,
  );

  try {
    const response = await getAnimeByProducer(id, 1);
    const list = Array.isArray(response?.data) ? response.data : [];
    const { role, matches } = classifyProducerRole(list, id);
    const items = filterOutHentai(matches).slice(0, limit).map(slimAnime);
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
    return res.status(200).json({ items, role });
  } catch {
    return res.status(502).json({ items: [], role: null });
  }
}
