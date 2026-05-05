import { getAnimeImageUrl } from './media';
import { getSeasonFromDate } from './season';

export const normalizeAnime = (anime) => {
  if (!anime) return null;
  const id = anime.mal_id ?? anime.id;
  if (!id) return null;
  return {
    id,
    title: anime.title || anime.title_english || 'Untitled',
    image: getAnimeImageUrl(anime),
    score: anime.score ?? null,
    type: anime.type || anime.format || 'Series',
    episodes: anime.episodes ?? null,
    status: anime.status || null,
    airing: Boolean(anime.airing),
    year: anime.year || anime?.aired?.prop?.from?.year || null,
    season: anime.season || null,
    genres: Array.isArray(anime.genres)
      ? anime.genres.map((entry) => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean)
      : [],
  };
};

export const isAiringAnime = (anime) => {
  if (!anime) return false;
  if (anime.airing === true) return true;
  const status = typeof anime.status === 'string' ? anime.status.toLowerCase() : '';
  if (status.includes('finished')) return false;
  if (status.includes('airing')) return true;
  return false;
};

// `isAiringAnime` only inspects status/airing fields, which is sometimes
// not enough — Jikan list entries (entries in `users/{uid}/list`) often
// have neither populated. Falls back to a season+year+type heuristic across
// any number of source objects, picking the first non-nullish value for
// each field. Used by `pages/my-list.js` and `components/modals/AddToListModal`
// to decide whether to coerce 'completed' → 'watching' (see `resolveStatus`
// in `lib/utils/listTransitions.js`).
//
// Pass sources in priority order: detail first, then list item, then catalog.
const pickFirstField = (sources, key) => {
  for (const source of sources) {
    if (!source) continue;
    const value = source[key];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
};

export const isAiringWithSeasonHeuristic = (
  sources,
  { currentSeason, currentYear } = {},
) => {
  const arr = Array.isArray(sources) ? sources : [sources];
  for (const source of arr) {
    if (!source) continue;
    if (source.airing === true) return true;
    if (isAiringAnime(source)) return true;
  }
  const season = currentSeason ?? getSeasonFromDate();
  const year = currentYear ?? new Date().getFullYear();
  const seasonLabel = String(pickFirstField(arr, 'season') ?? '').toLowerCase();
  if (!seasonLabel || seasonLabel !== season) return false;
  const yearVal = Number(pickFirstField(arr, 'year'));
  if (!Number.isFinite(yearVal) || yearVal !== year) return false;
  return String(pickFirstField(arr, 'type') ?? '').toLowerCase().includes('tv');
};

export const isHentaiAnime = (anime) => {
  if (!anime) return false;
  const rating = typeof anime?.rating === 'string' ? anime.rating.toLowerCase() : '';
  if (rating.includes('hentai')) return true;
  const genres = Array.isArray(anime?.genres) ? anime.genres : [];
  const explicitGenres = Array.isArray(anime?.explicit_genres) ? anime.explicit_genres : [];
  const allGenres = [...genres, ...explicitGenres];
  return allGenres.some((genre) => String(genre?.name || '').toLowerCase() === 'hentai');
};

export const filterOutHentai = (items = []) => items.filter((item) => !isHentaiAnime(item));

// First-listed studio name for a Jikan anime entry. Used in headers /
// captions where showing "Studio · Year" is common. Returns an empty
// string so callers can chain it with truthy checks cleanly.
export const primaryStudioName = (anime) => {
  if (!Array.isArray(anime?.studios) || !anime.studios.length) return '';
  return anime.studios[0]?.name || '';
};

// Trim a Jikan anime payload to the fields our client actually renders,
// for SSR prop serialisation. Drops big chunks (producers/licensors/
// title_synonyms/broadcast) we never need downstream and normalises
// nested fields to a predictable shape.
export const slimAnimeForDiscover = (a) => ({
  mal_id: a?.mal_id,
  title: a?.title,
  synopsis: a?.synopsis,
  score: typeof a?.score === 'number' ? a.score : null,
  rank: Number.isFinite(a?.rank) ? a.rank : null,
  year: a?.year || a?.aired?.prop?.from?.year || null,
  aired: a?.aired ? { prop: { from: a.aired.prop?.from || null } } : null,
  type: a?.type || null,
  episodes: Number.isFinite(a?.episodes) ? a.episodes : null,
  duration: a?.duration || null,
  popularity: Number.isFinite(a?.popularity) ? a.popularity : null,
  members: Number.isFinite(a?.members) ? a.members : null,
  genres: Array.isArray(a?.genres)
    ? a.genres.map((g) =>
        typeof g === 'string' ? g : { mal_id: g?.mal_id ?? null, name: g?.name || '' },
      )
    : [],
  studios: Array.isArray(a?.studios)
    ? a.studios.map((s) => ({ mal_id: s?.mal_id ?? null, name: s?.name || '' }))
    : [],
  images: {
    webp: {
      image_url: a?.images?.webp?.image_url || null,
      large_image_url: a?.images?.webp?.large_image_url || null,
    },
    jpg: {
      image_url: a?.images?.jpg?.image_url || null,
      large_image_url: a?.images?.jpg?.large_image_url || null,
    },
  },
});

// Jikan occasionally returns the same mal_id more than once in a single
// response — most visibly on `/schedules/{day}`, where a show with multiple
// broadcast rows (e.g. schedule changes, re-runs, simulcast on more than
// one channel) is serialised as separate entries even though it's the same
// anime. Apply this right after `filterOutHentai` to keep grids from
// rendering the same card three times in a row.
export const dedupeByMalId = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = item?.mal_id;
    if (!id) return true; // no id? keep — nothing to dedupe against
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
