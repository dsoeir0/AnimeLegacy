import * as Sentry from '@sentry/nextjs';
import { getSchedules } from '../../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../../lib/utils/anime';
import { WEEKDAY_KEYS } from '../../lib/utils/time';
import { createRateLimiter, guardApiRoute } from '../../lib/utils/rateLimit';

const limiter = createRateLimiter({ max: 60, windowMs: 60_000 });

const slim = (a) => ({
  mal_id: a?.mal_id ?? null,
  title: a?.title ?? null,
  images: {
    webp: {
      image_url: a?.images?.webp?.image_url ?? null,
      large_image_url: a?.images?.webp?.large_image_url ?? null,
    },
    jpg: {
      image_url: a?.images?.jpg?.image_url ?? null,
      large_image_url: a?.images?.jpg?.large_image_url ?? null,
    },
  },
  broadcast: a?.broadcast?.time ? { time: a.broadcast.time } : null,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ schedulesByDay: null });
  }
  if (!guardApiRoute(req, res, limiter)) return;

  try {
    const entries = await Promise.all(
      WEEKDAY_KEYS.map((key) => getSchedules(key).then((r) => [key, r])),
    );
    const schedulesByDay = Object.fromEntries(
      entries.map(([key, r]) => [
        key,
        Array.isArray(r?.data)
          ? dedupeByMalId(filterOutHentai(r.data)).map(slim)
          : [],
      ]),
    );
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    return res.status(200).json({ schedulesByDay });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'schedules' } });
    return res.status(502).json({ schedulesByDay: null });
  }
}
