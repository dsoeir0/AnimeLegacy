// Thin client-callable wrapper around `getAnimeByProducer`. Fetching Jikan
// directly from the browser fails CORS; this route proxies a single
// studio's top-scored anime so the studios index can fill in mini-posters
// progressively after hydration without blasting Jikan with 24 parallel
// server-side requests during SSR.
//
// Query params:
//   id  (number, required) — producer mal_id
//   limit (number, optional, default 4, max 8)
//
// Response: { items: Array<{ mal_id, title, score, images: { webp, jpg } }> }
// Error responses share the same JSON shape with `items: []` so the client
// can treat them uniformly.

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
    // `classifyProducerRole` (shared with the studios index SSR) splits the
    // results into studio-role vs producer-role matches so the same title
    // doesn't appear on both Bones's card and Aniplex's card when they
    // both touched the same anime in different capacities. See the helper
    // for the full rationale and test coverage.
    const { role, matches } = classifyProducerRole(list, id);
    const items = filterOutHentai(matches).slice(0, limit).map(slimAnime);
    // Our in-memory cache (see lib/services/_cache.js) handles repeated hits
    // for the same studio within the TTL, so we don't re-hit Jikan per page
    // load. Set a short browser cache too for back/forward nav.
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
    return res.status(200).json({ items, role });
  } catch {
    return res.status(502).json({ items: [], role: null });
  }
}
