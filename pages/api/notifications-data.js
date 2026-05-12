import { getAnimeRelations, getSchedules } from '../../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../../lib/utils/anime';
import { WEEKDAY_KEYS } from '../../lib/utils/time';
import { createRateLimiter, guardApiRoute } from '../../lib/utils/rateLimit';

const limiter = createRateLimiter({ max: 30, windowMs: 60_000 });

const slimSchedule = (a) => ({
  mal_id: a?.mal_id,
  title: a?.title,
});

const slimRelation = (entry) => ({
  mal_id: entry?.mal_id,
  title: entry?.name || entry?.title,
});

const parseIds = (raw) =>
  String(raw || '')
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 12);

const SEQUEL_RELATION_TYPES = new Set(['sequel']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ schedulesByDay: null, relationsByFavorite: {} });
  }
  if (!guardApiRoute(req, res, limiter)) return;

  const wantSchedules = req.query.schedules !== '0';
  const favoriteIds = parseIds(req.query.favorites);

  let schedulesByDay = null;
  if (wantSchedules) {
    try {
      const entries = await Promise.all(
        WEEKDAY_KEYS.map((key) => getSchedules(key).then((r) => [key, r])),
      );
      schedulesByDay = Object.fromEntries(
        entries.map(([key, r]) => [
          key,
          Array.isArray(r?.data)
            ? dedupeByMalId(filterOutHentai(r.data)).map(slimSchedule)
            : [],
        ]),
      );
    } catch {
      schedulesByDay = null;
    }
  }

  const relationsByFavorite = {};
  if (favoriteIds.length > 0) {
    const results = await Promise.all(
      favoriteIds.map(async (id) => {
        try {
          const r = await getAnimeRelations(id);
          const relations = Array.isArray(r?.data) ? r.data : [];
          const sequels = [];
          for (const relation of relations) {
            const relType = String(relation?.relation || '').toLowerCase();
            if (!SEQUEL_RELATION_TYPES.has(relType)) continue;
            const entries = Array.isArray(relation?.entry) ? relation.entry : [];
            for (const entry of entries) {
              if (String(entry?.type || '').toLowerCase() !== 'anime') continue;
              const slim = slimRelation(entry);
              if (slim.mal_id && slim.title) sequels.push(slim);
            }
          }
          return [id, { sequels }];
        } catch {
          return [id, { sequels: [] }];
        }
      }),
    );
    for (const [id, value] of results) relationsByFavorite[String(id)] = value;
  }

  res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=900');
  return res.status(200).json({ schedulesByDay, relationsByFavorite });
}
