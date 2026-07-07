import * as Sentry from '@sentry/nextjs';
import {
  getCharacterAnime,
  getCharacterVoices,
} from '../../lib/services/jikan';
import { isHentaiAnime } from '../../lib/utils/anime';
import {
  pickPrincipalRole,
  pickPrincipalVoice,
} from '../../lib/utils/characterOfMonth';
import { chunk } from '../../lib/utils/chunk';
import { createRateLimiter, guardApiRoute } from '../../lib/utils/rateLimit';

const limiter = createRateLimiter({ max: 120, windowMs: 60_000 });

const parseIds = (raw) =>
  String(raw || '')
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 30);

const enrichOne = async (id) => {
  const [animeRes, voicesRes] = await Promise.all([
    getCharacterAnime(id),
    getCharacterVoices(id),
  ]);
  const rawAnimeList = Array.isArray(animeRes?.data) ? animeRes.data : [];
  const safeAnimeList = rawAnimeList.filter(
    (entry) => !isHentaiAnime(entry?.anime),
  );
  const principal = pickPrincipalRole(safeAnimeList);
  const voicesList = Array.isArray(voicesRes?.data) ? voicesRes.data : [];
  const voice = pickPrincipalVoice(voicesList);
  return {
    id,
    role: principal?.role || null,
    animeTitle: principal?.anime?.title || null,
    voiceActor: voice?.person
      ? {
          name: voice.person.name || null,
          image:
            voice.person.images?.jpg?.image_url ||
            voice.person.images?.webp?.image_url ||
            null,
        }
      : null,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ enriched: [] });
  }
  if (!guardApiRoute(req, res, limiter)) return;

  const ids = parseIds(req.query?.ids);
  if (ids.length === 0) {
    return res.status(200).json({ enriched: [] });
  }

  try {
    const batches = chunk(ids, 3);
    const enriched = [];
    for (const batch of batches) {
      const results = await Promise.all(batch.map(enrichOne));
      enriched.push(...results);
    }
    const allComplete = enriched.every(
      (e) => e.role && e.animeTitle && e.voiceActor,
    );
    res.setHeader(
      'Cache-Control',
      allComplete
        ? 'public, max-age=300, stale-while-revalidate=900'
        : 'public, max-age=15, stale-while-revalidate=60',
    );
    return res.status(200).json({ enriched });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'characters-enrich' } });
    return res.status(502).json({ enriched: [] });
  }
}
