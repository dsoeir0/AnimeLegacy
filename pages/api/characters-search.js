import * as Sentry from '@sentry/nextjs';
import {
  getAnimeCharacters,
  getPersonVoices,
  searchAnime,
  searchCharacters,
  searchPeople,
} from '../../lib/services/jikan';
import staticEnrichment from '../../lib/data/characterEnrichment.json';
import { createRateLimiter, guardApiRoute } from '../../lib/utils/rateLimit';

const limiter = createRateLimiter({ max: 120, windowMs: 60_000 });

const MAX_RESULTS = 24;
const ANIME_BRANCH = 2;
const PEOPLE_BRANCH = 2;
const CHARS_PER_ANIME = 6;
const CHARS_PER_PERSON = 8;

const POPULAR_IDS = new Set(
  Object.keys(staticEnrichment)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n)),
);

const toCharShape = (c) => {
  if (!c?.mal_id || !c?.name) return null;
  return {
    mal_id: c.mal_id,
    name: c.name,
    name_kanji: c.name_kanji || '',
    images: c.images || null,
    favorites: typeof c.favorites === 'number' ? c.favorites : null,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ data: [] });
  }
  if (!guardApiRoute(req, res, limiter)) return;

  const query = String(req.query?.q || '').trim().slice(0, 80);
  if (query.length < 2) {
    return res.status(200).json({ data: [] });
  }

  try {
    const [byName, byAnime, byPerson] = await Promise.all([
      searchCharacters(query, 1, 15),
      searchAnime(query, 1, ANIME_BRANCH),
      searchPeople(query, 1, PEOPLE_BRANCH),
    ]);

    const collected = new Map();
    const addCandidate = (c) => {
      const shape = toCharShape(c);
      if (!shape) return;
      const existing = collected.get(shape.mal_id);
      if (!existing) {
        collected.set(shape.mal_id, shape);
        return;
      }
      if ((shape.favorites || 0) > (existing.favorites || 0)) {
        collected.set(shape.mal_id, shape);
      }
    };

    if (Array.isArray(byName?.data)) {
      for (const c of byName.data) addCandidate(c);
    }

    const animeHits = Array.isArray(byAnime?.data) ? byAnime.data : [];
    const animeCharLists = await Promise.all(
      animeHits.slice(0, ANIME_BRANCH).map((a) => getAnimeCharacters(a?.mal_id)),
    );
    for (const list of animeCharLists) {
      if (!Array.isArray(list?.data)) continue;
      const sorted = [...list.data].sort(
        (a, b) => (b?.favorites || 0) - (a?.favorites || 0),
      );
      for (const entry of sorted.slice(0, CHARS_PER_ANIME)) {
        addCandidate(entry?.character);
      }
    }

    const peopleHits = Array.isArray(byPerson?.data) ? byPerson.data : [];
    const peopleVoiceLists = await Promise.all(
      peopleHits.slice(0, PEOPLE_BRANCH).map((p) => getPersonVoices(p?.mal_id)),
    );
    for (const list of peopleVoiceLists) {
      if (!Array.isArray(list?.data)) continue;
      const seen = new Set();
      const popular = [];
      const rest = [];
      for (const entry of list.data) {
        const id = entry?.character?.mal_id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        if (POPULAR_IDS.has(id)) popular.push(entry);
        else rest.push(entry);
      }
      const merged = [...popular, ...rest].slice(0, CHARS_PER_PERSON);
      for (const entry of merged) {
        const char = entry?.character;
        if (!char) continue;
        const pop = staticEnrichment[String(char.mal_id)];
        const enriched = pop
          ? { ...char, favorites: pop.favorites }
          : char;
        addCandidate(enriched);
      }
    }

    const results = Array.from(collected.values())
      .sort((a, b) => (b.favorites || 0) - (a.favorites || 0))
      .slice(0, MAX_RESULTS);

    res.setHeader(
      'Cache-Control',
      'public, max-age=120, stale-while-revalidate=600',
    );
    return res.status(200).json({ data: results });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'characters-search' } });
    return res.status(502).json({ data: [] });
  }
}
