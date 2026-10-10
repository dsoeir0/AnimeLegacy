import { MISS, peek, peekStale, put } from './_cache';
import { isAniListBlocked, noteAniListRateLimit } from './anilistLimit';

// Jikan-shaped responses sourced from AniList, used only when Jikan is down
// so anime pages never render empty. AniList knows each anime's MAL id but
// not MAL ids for characters, people or studios, so only anime data has a
// fallback. Items without a MAL id are dropped: every card links to
// /anime/{mal_id}.

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const FETCH_TIMEOUT_MS = 8000;
const TTL_MS = 30 * 60 * 1000;
const GENRES_TTL_MS = 24 * 60 * 60 * 1000;
// A multi-page result that lost a page (usually to a 429) is refreshed soon.
const PARTIAL_TTL_MS = 2 * 60 * 1000;
const ERROR = Object.freeze({ data: [], pagination: {}, error: true });

// MAL genre/theme ids <-> AniList genre names. `genre: true` marks the ones
// Jikan lists under /genres/anime?filter=genres (themes are filter-only).
const MAL_GENRES = [
  { mal_id: 1, name: 'Action', aniList: 'Action', genre: true },
  { mal_id: 2, name: 'Adventure', aniList: 'Adventure', genre: true },
  { mal_id: 4, name: 'Comedy', aniList: 'Comedy', genre: true },
  { mal_id: 8, name: 'Drama', aniList: 'Drama', genre: true },
  { mal_id: 9, name: 'Ecchi', aniList: 'Ecchi', genre: true },
  { mal_id: 10, name: 'Fantasy', aniList: 'Fantasy', genre: true },
  { mal_id: 14, name: 'Horror', aniList: 'Horror', genre: true },
  { mal_id: 7, name: 'Mystery', aniList: 'Mystery', genre: true },
  { mal_id: 22, name: 'Romance', aniList: 'Romance', genre: true },
  { mal_id: 24, name: 'Sci-Fi', aniList: 'Sci-Fi', genre: true },
  { mal_id: 36, name: 'Slice of Life', aniList: 'Slice of Life', genre: true },
  { mal_id: 30, name: 'Sports', aniList: 'Sports', genre: true },
  { mal_id: 37, name: 'Supernatural', aniList: 'Supernatural', genre: true },
  { mal_id: 41, name: 'Suspense', aniList: 'Thriller', genre: true },
  { mal_id: 18, name: 'Mecha', aniList: 'Mecha' },
  { mal_id: 19, name: 'Music', aniList: 'Music' },
  { mal_id: 40, name: 'Psychological', aniList: 'Psychological' },
  { mal_id: 66, name: 'Mahou Shoujo', aniList: 'Mahou Shoujo' },
  { mal_id: 12, name: 'Hentai', aniList: 'Hentai' },
];
const GENRE_BY_ANILIST = new Map(MAL_GENRES.map((g) => [g.aniList, g]));
const GENRE_BY_MAL_ID = new Map(MAL_GENRES.map((g) => [g.mal_id, g]));

const LIST_FIELDS = `
  idMal
  title { romaji english native }
  description(asHtml: false)
  format
  status
  episodes
  duration
  averageScore
  popularity
  favourites
  season
  seasonYear
  isAdult
  startDate { year month day }
  endDate { year month day }
  coverImage { extraLarge large }
  genres
  studios(isMain: true) { nodes { name } }
`;

const DETAIL_FIELDS = `
  ${LIST_FIELDS}
  source
  trailer { id site }
  rankings { rank type allTime }
  allStudios: studios { edges { isMain node { name } } }
`;

const PAGE_INFO = 'pageInfo { total perPage currentPage lastPage hasNextPage }';

const FORMAT_TO_TYPE = {
  TV: 'TV',
  TV_SHORT: 'TV',
  MOVIE: 'Movie',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Special',
  MUSIC: 'Music',
};

const STATUS_TO_JIKAN = {
  RELEASING: 'Currently Airing',
  FINISHED: 'Finished Airing',
  NOT_YET_RELEASED: 'Not yet aired',
  CANCELLED: 'Finished Airing',
  HIATUS: 'Currently Airing',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toIsoDate = (date) => {
  if (!date?.year) return null;
  const month = String(date.month || 1).padStart(2, '0');
  const day = String(date.day || 1).padStart(2, '0');
  return `${date.year}-${month}-${day}T00:00:00+00:00`;
};

const toAiredLabel = (date) => {
  if (!date?.year) return null;
  if (!date.month) return String(date.year);
  const month = MONTHS[date.month - 1];
  return date.day ? `${month} ${date.day}, ${date.year}` : `${month} ${date.year}`;
};

const toAiredString = (start, end, status) => {
  const from = toAiredLabel(start);
  if (!from) return 'Not available';
  const to = toAiredLabel(end);
  if (to && to !== from) return `${from} to ${to}`;
  return status === 'RELEASING' ? `${from} to ?` : from;
};

const toTitleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const stripHtml = (text) =>
  typeof text === 'string'
    ? text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    : null;

const toGenres = (names) =>
  (names || []).map((name) => {
    const known = GENRE_BY_ANILIST.get(name);
    return known ? { mal_id: known.mal_id, name: known.name } : { name };
  });

export const aniListMediaToJikan = (media) => {
  if (!media?.idMal) return null;
  const cover = media.coverImage?.extraLarge || media.coverImage?.large || null;
  const images = { image_url: cover, large_image_url: cover };
  return {
    mal_id: media.idMal,
    title: media.title?.romaji || media.title?.english || '',
    title_english: media.title?.english || null,
    synopsis: stripHtml(media.description),
    type: FORMAT_TO_TYPE[media.format] || media.format || null,
    episodes: media.episodes ?? null,
    score: typeof media.averageScore === 'number' ? media.averageScore / 10 : null,
    members: media.popularity ?? null,
    season: media.season ? media.season.toLowerCase() : null,
    year: media.seasonYear || media.startDate?.year || null,
    duration: media.duration ? `${media.duration} min per ep` : null,
    status: STATUS_TO_JIKAN[media.status] || null,
    airing: media.status === 'RELEASING',
    aired: {
      from: toIsoDate(media.startDate),
      to: toIsoDate(media.endDate),
      prop: { from: { year: media.startDate?.year || null } },
      string: toAiredString(media.startDate, media.endDate, media.status),
    },
    rating: media.isAdult ? 'Rx - Hentai' : null,
    genres: toGenres(media.genres),
    studios: (media.studios?.nodes || []).map(({ name }) => ({ name })),
    images: { jpg: images, webp: images },
  };
};

export const aniListMediaToJikanDetail = (media) => {
  const base = aniListMediaToJikan(media);
  if (!base) return null;
  const allTime = (type) =>
    (media.rankings || []).find((r) => r.type === type && r.allTime)?.rank ?? null;
  const edges = media.allStudios?.edges || [];
  const trailer =
    media.trailer?.site === 'youtube' && media.trailer?.id
      ? { youtube_id: media.trailer.id, embed_url: `https://www.youtube.com/embed/${media.trailer.id}` }
      : { youtube_id: null, embed_url: null };
  return {
    ...base,
    title_japanese: media.title?.native || null,
    background: null,
    rank: allTime('RATED'),
    popularity: allTime('POPULAR'),
    scored_by: null,
    favorites: media.favourites ?? null,
    source: media.source ? toTitleCase(media.source) : null,
    trailer,
    studios: edges.filter((e) => e.isMain).map((e) => ({ name: e.node.name })),
    producers: edges.filter((e) => !e.isMain).map((e) => ({ name: e.node.name })),
  };
};

// AniList caps pageInfo.total (and so lastPage) at 5000; past that only
// hasNextPage is trustworthy, so expose one page beyond the current one.
const ANILIST_TOTAL_CAP = 5000;

export const toPagination = (pageInfo, count) => {
  if (!pageInfo) return {};
  const current = pageInfo.currentPage || 1;
  const perPage = pageInfo.perPage || count;
  const hasNext = Boolean(pageInfo.hasNextPage);
  const capped = (pageInfo.total || 0) >= ANILIST_TOTAL_CAP;
  const lastPage = capped ? current + (hasNext ? 1 : 0) : pageInfo.lastPage || current;
  const total = capped ? lastPage * perPage : pageInfo.total || count;
  return {
    last_visible_page: lastPage,
    has_next_page: hasNext,
    current_page: current,
    items: { count, total, per_page: perPage },
  };
};

const postAniList = async (query, variables) => {
  if (isAniListBlocked()) return null;
  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (noteAniListRateLimit(response) || !response.ok) return null;
    const payload = await response.json();
    return payload?.data || null;
  } catch {
    return null;
  }
};

// Cache only successful results so a failing AniList is retried next time,
// and serve the last good (even expired) result while it keeps failing.
const cachedAniList = async (key, build, ttlMs = TTL_MS) => {
  const hit = peek(key);
  if (hit !== MISS) return hit;
  const result = await build();
  if (!result?.error) {
    put(key, result.partial ? PARTIAL_TTL_MS : ttlMs, result);
    return result;
  }
  const stale = peekStale(key);
  return stale !== MISS ? stale : result;
};

const pageQuery = (args, argDefs = '') => `
  query ($page: Int, $perPage: Int${argDefs}) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(type: ANIME, isAdult: false, ${args}) { ${LIST_FIELDS} }
    }
  }
`;

const queryMediaPage = (key, query, variables) =>
  cachedAniList(key, async () => {
    const data = await postAniList(query, variables);
    const page = data?.Page;
    if (!page) return ERROR;
    const items = (page.media || []).map(aniListMediaToJikan).filter(Boolean);
    if (!items.length) return ERROR;
    return { data: items, pagination: toPagination(page.pageInfo, items.length) };
  });

const SEASON_QUERY = pageQuery(
  'season: $season, seasonYear: $year, sort: POPULARITY_DESC',
  ', $season: MediaSeason, $year: Int',
);

export const getAniListSeason = (year, season) =>
  queryMediaPage(`anilist:fallback:season:${year}:${season}`, SEASON_QUERY, {
    year: Number(year),
    season: String(season).toUpperCase(),
    page: 1,
    perPage: 50,
  });

const TOP_MOVIES_QUERY = pageQuery('format: MOVIE, sort: SCORE_DESC');

export const getAniListTopMovies = () =>
  queryMediaPage('anilist:fallback:top-movies', TOP_MOVIES_QUERY, { page: 1, perPage: 24 });

const TOP_QUERY = pageQuery('sort: SCORE_DESC');

export const getAniListTopAnime = (page = 1) =>
  queryMediaPage(`anilist:fallback:top:${page}`, TOP_QUERY, { page: Number(page), perPage: 24 });

const SEARCH_QUERY = pageQuery('search: $search, sort: SEARCH_MATCH', ', $search: String');

export const getAniListSearch = (query, page = 1, limit = 21) => {
  const search = String(query || '').trim();
  if (!search) return Promise.resolve(ERROR);
  return queryMediaPage(`anilist:fallback:search:${search}:${page}:${limit}`, SEARCH_QUERY, {
    search,
    page: Number(page),
    perPage: Number(limit),
  });
};

const FILTER_QUERY = pageQuery(
  'genre_in: $genres, format_in: $formats, status: $status, averageScore_greater: $minScore, ' +
    'startDate_greater: $startAfter, startDate_lesser: $startBefore, sort: $sort',
  ', $genres: [String], $formats: [MediaFormat], $status: MediaStatus, $minScore: Int, ' +
    '$startAfter: FuzzyDateInt, $startBefore: FuzzyDateInt, $sort: [MediaSort]',
);

const SORTS = {
  score: { desc: 'SCORE_DESC', asc: 'SCORE' },
  start_date: { desc: 'START_DATE_DESC', asc: 'START_DATE' },
  title: { asc: 'TITLE_ROMAJI', desc: 'TITLE_ROMAJI_DESC' },
  // Jikan's popularity is a rank, so ascending means most popular first.
  popularity: { asc: 'POPULARITY_DESC', desc: 'POPULARITY' },
};

const FORMATS = {
  tv: ['TV', 'TV_SHORT'],
  movie: ['MOVIE'],
  ova: ['OVA'],
  special: ['SPECIAL'],
  ona: ['ONA'],
};

const STATUSES = { airing: 'RELEASING', complete: 'FINISHED', upcoming: 'NOT_YET_RELEASED' };

const toFuzzyDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? Number(`${match[1]}${match[2]}${match[3]}`) : null;
};

// Translate a Jikan /anime query string into AniList filter variables.
// Returns null when the request can't be expressed faithfully.
export const jikanFilterToAniList = (params) => {
  const query = new URLSearchParams(params || '');
  const variables = {};

  const genreIds = (query.get('genres') || '')
    .split(',')
    .map((id) => Number(id))
    .filter(Boolean);
  if (genreIds.length) {
    const names = genreIds.map((id) => GENRE_BY_MAL_ID.get(id)?.aniList).filter(Boolean);
    if (names.length !== genreIds.length) return null;
    variables.genres = names;
  }

  const type = query.get('type');
  if (type) {
    if (!FORMATS[type]) return null;
    variables.formats = FORMATS[type];
  }

  const status = query.get('status');
  if (status) {
    if (!STATUSES[status]) return null;
    variables.status = STATUSES[status];
  }

  const minScore = Number(query.get('min_score'));
  if (minScore) variables.minScore = Math.round(minScore * 10) - 1;

  const startAfter = toFuzzyDate(query.get('start_date'));
  if (startAfter) variables.startAfter = startAfter - 1;
  const startBefore = toFuzzyDate(query.get('end_date'));
  if (startBefore) variables.startBefore = startBefore + 1;

  const orderBy = query.get('order_by') || 'popularity';
  const direction = query.get('sort') === 'asc' ? 'asc' : 'desc';
  variables.sort = [SORTS[orderBy]?.[direction] || 'POPULARITY_DESC'];

  return variables;
};

export const getAniListAnimeByFilter = (params, page = 1) => {
  const variables = jikanFilterToAniList(params);
  if (!variables) return Promise.resolve(ERROR);
  return queryMediaPage(`anilist:fallback:filter:${params}:${page}`, FILTER_QUERY, {
    ...variables,
    page: Number(page),
    perPage: 24,
  });
};

const GENRE_COUNTS_QUERY = `query { ${MAL_GENRES.filter((g) => g.genre)
  .map(
    (g) =>
      `g${g.mal_id}: Page(perPage: 1) { pageInfo { total } media(type: ANIME, isAdult: false, genre: "${g.aniList}") { id } }`,
  )
  .join('\n')} }`;

export const getAniListGenres = () =>
  cachedAniList('anilist:fallback:genres', async () => {
    const data = await postAniList(GENRE_COUNTS_QUERY, {});
    if (!data) return ERROR;
    const genres = MAL_GENRES.filter((g) => g.genre).map((g) => ({
      mal_id: g.mal_id,
      name: g.name,
      count: data[`g${g.mal_id}`]?.pageInfo?.total ?? 0,
    }));
    return { data: genres };
  }, GENRES_TTL_MS);

const DETAIL_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) { ${DETAIL_FIELDS} }
  }
`;

export const getAniListAnimeById = (malId) =>
  cachedAniList(`anilist:fallback:anime:${malId}`, async () => {
    const data = await postAniList(DETAIL_QUERY, { idMal: Number(malId) });
    const anime = aniListMediaToJikanDetail(data?.Media);
    return anime ? { data: anime } : { data: null, error: true };
  });

const RECOMMENDATIONS_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      recommendations(sort: RATING_DESC, perPage: 25) {
        nodes { mediaRecommendation { ${LIST_FIELDS} } }
      }
    }
  }
`;

export const getAniListRecommendations = (malId) =>
  cachedAniList(`anilist:fallback:anime:${malId}:recs`, async () => {
    const data = await postAniList(RECOMMENDATIONS_QUERY, { idMal: Number(malId) });
    const nodes = data?.Media?.recommendations?.nodes;
    if (!Array.isArray(nodes)) return { data: [], error: true };
    const entries = nodes
      .map((node) => aniListMediaToJikan(node?.mediaRecommendation))
      .filter((entry) => entry && !entry.rating)
      .map((entry) => ({ entry }));
    return { data: entries };
  });

const RELATIONS_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      relations { edges { relationType node { idMal type title { romaji english } } } }
    }
  }
`;

export const getAniListRelations = (malId) =>
  cachedAniList(`anilist:fallback:anime:${malId}:relations`, async () => {
    const data = await postAniList(RELATIONS_QUERY, { idMal: Number(malId) });
    const edges = data?.Media?.relations?.edges;
    if (!Array.isArray(edges)) return { data: [], error: true };
    const grouped = new Map();
    for (const edge of edges) {
      const node = edge?.node;
      if (!node?.idMal) continue;
      const relation = toTitleCase(edge.relationType);
      if (!grouped.has(relation)) grouped.set(relation, []);
      grouped.get(relation).push({
        mal_id: node.idMal,
        type: String(node.type || '').toLowerCase(),
        name: node.title?.romaji || node.title?.english || '',
      });
    }
    return { data: Array.from(grouped, ([relation, entry]) => ({ relation, entry })) };
  });

const SCHEDULE_QUERY = `
  query ($page: Int, $start: Int, $end: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        airingAt
        media { ${LIST_FIELDS} }
      }
    }
  }
`;

const SCHEDULE_PAGE_CAP = 8;
const JST_OFFSET_S = 9 * 60 * 60;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Jikan buckets schedules by the JST broadcast weekday with a JST "HH:MM".
export const toJstBroadcast = (airingAt) => {
  const jst = new Date((airingAt + JST_OFFSET_S) * 1000);
  const day = WEEKDAYS[jst.getUTCDay()];
  const time = `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;
  return { day, time };
};

const getAniListWeekSchedule = () =>
  cachedAniList('anilist:fallback:schedule-week', async () => {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 24 * 60 * 60;
    const end = start + 7 * 24 * 60 * 60;
    const byDay = Object.fromEntries(WEEKDAYS.map((day) => [day, []]));
    let partial = false;
    for (let page = 1; page <= SCHEDULE_PAGE_CAP; page += 1) {
      const data = await postAniList(SCHEDULE_QUERY, { page, start, end });
      const result = data?.Page;
      if (!result) {
        if (page === 1) return ERROR;
        partial = true;
        break;
      }
      for (const slot of result.airingSchedules || []) {
        const anime = aniListMediaToJikan(slot?.media);
        if (!anime || slot.media.isAdult) continue;
        const { day, time } = toJstBroadcast(slot.airingAt);
        byDay[day].push({
          ...anime,
          broadcast: {
            day: `${day.charAt(0).toUpperCase()}${day.slice(1)}s`,
            time,
            timezone: 'Asia/Tokyo',
          },
        });
      }
      if (!result.pageInfo?.hasNextPage) break;
    }
    return partial ? { data: byDay, partial } : { data: byDay };
  });

export const getAniListSchedules = async (day) => {
  const week = await getAniListWeekSchedule();
  if (week?.error) return ERROR;
  const data = day ? week.data[day] || [] : WEEKDAYS.flatMap((d) => week.data[d]);
  return { data, pagination: {} };
};
