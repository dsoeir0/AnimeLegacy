// Pure helpers for converting MAL list entries (as returned by the internal
// `/animelist/{username}/load.json` endpoint) into the shape our `useMyList`
// hook expects. Kept pure so we can unit-test every branch without a network.
//
// Reference for the payload shape is `load.json` itself — each entry has:
//   status: 1=Watching, 2=Completed, 3=On-Hold, 4=Dropped, 6=Plan-to-Watch
//   score: 0..10 (0 = unrated)
//   num_watched_episodes, anime_id, anime_title, anime_image_path,
//   anime_num_episodes, anime_airing_status (1=airing, 2=finished, 3=upcoming),
//   anime_media_type_string, anime_start_date_string, genres: [{id, name}]

const MAL_STATUS_TO_OURS = {
  1: 'watching',
  2: 'completed',
  3: 'on_hold',
  4: 'dropped',
  6: 'plan',
};

export const mapMalStatus = (status) => MAL_STATUS_TO_OURS[status] || null;

// MAL scores are 1..10 integers; our rating is 0.5..5 with half-star steps.
// Division by 2 maps cleanly (10 → 5, 9 → 4.5, …, 1 → 0.5). 0 means "no rating".
export const mapMalScore = (score) => {
  if (!Number.isFinite(score)) return null;
  if (score <= 0) return null;
  const clamped = Math.min(Math.max(score, 1), 10);
  return clamped / 2;
};

// Extract the year out of MAL's "MM-DD-YY" start date string. The YY is a 2-
// digit year that we widen with a 70-year pivot so 60–99 means 19xx and 00–59
// means 20xx (MAL's oldest anime entries are from the 1910s, but the 2-digit
// format can't represent those anyway — it emits empty strings).
export const parseMalYear = (startDateString) => {
  if (typeof startDateString !== 'string') return null;
  const match = startDateString.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (!match) return null;
  const yy = Number(match[3]);
  if (!Number.isFinite(yy)) return null;
  return yy >= 60 ? 1900 + yy : 2000 + yy;
};

const MAL_AIRING_STATUS_TO_LABEL = {
  1: 'Currently Airing',
  2: 'Finished Airing',
  3: 'Not yet aired',
};

// Convert a MAL list entry into the shape `useMyList.addItem` wants in its
// first argument (the anime record) + the second-argument options (status /
// progress / rating). Returns null when the entry is unusable (no MAL id, or
// a status we can't map — i.e. MAL's private "priority" lists).
export const toImportPayload = (malItem) => {
  if (!malItem || typeof malItem !== 'object') return null;
  const malId = Number(malItem.anime_id);
  if (!Number.isFinite(malId) || malId <= 0) return null;
  const status = mapMalStatus(malItem.status);
  if (!status) return null;

  const totalEpisodes = Number.isFinite(malItem.anime_num_episodes)
    ? malItem.anime_num_episodes
    : null;
  const progressRaw = Number.isFinite(malItem.num_watched_episodes)
    ? malItem.num_watched_episodes
    : 0;
  const rating = mapMalScore(Number(malItem.score));
  const airing = malItem.anime_airing_status === 1;
  const title =
    (typeof malItem.anime_title === 'string' && malItem.anime_title.trim()) ||
    (typeof malItem.anime_title_eng === 'string' && malItem.anime_title_eng.trim()) ||
    'Untitled';
  const image = typeof malItem.anime_image_path === 'string' ? malItem.anime_image_path : '';

  return {
    anime: {
      id: malId,
      mal_id: malId,
      title,
      image,
      episodes: totalEpisodes,
      type: malItem.anime_media_type_string || 'TV',
      airing,
      status: MAL_AIRING_STATUS_TO_LABEL[malItem.anime_airing_status] || null,
      year: parseMalYear(malItem.anime_start_date_string),
      genres: Array.isArray(malItem.genres)
        ? malItem.genres.map((g) => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
        : [],
    },
    options: {
      status,
      progress: progressRaw,
      ...(rating !== null ? { rating } : {}),
    },
  };
};

// Takes the `data.anime` array from Jikan's /users/{u}/favorites response
// and returns a set of MAL anime ids that the user marked as favourite. Used
// to flip `isFavorite: true` on list entries whose id matches during import.
export const favoriteAnimeIds = (jikanFavAnime) => {
  const ids = new Set();
  if (!Array.isArray(jikanFavAnime)) return ids;
  for (const entry of jikanFavAnime) {
    const id = Number(entry?.mal_id);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  }
  return ids;
};

// Convert a Jikan favourite-character entry into the Firestore shape we use
// for `users/{uid}/favoriteCharacters/{mal_id}`. Mirrors the fields written
// by pages/characters/[id].js so the profile page renders imported
// favourites the same as hand-picked ones.
export const toFavoriteCharacterPayload = (jikanChar) => {
  if (!jikanChar || typeof jikanChar !== 'object') return null;
  const id = Number(jikanChar.mal_id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof jikanChar.name === 'string' ? jikanChar.name.trim() : '';
  if (!name) return null;
  const imageUrl =
    jikanChar?.images?.webp?.image_url || jikanChar?.images?.jpg?.image_url || '';
  return {
    id: String(id),
    malId: id,
    name,
    nameKanji: typeof jikanChar.name_kanji === 'string' ? jikanChar.name_kanji : '',
    imageUrl,
  };
};

// Build a breakdown of how the import will look, grouped by status and with
// a skip/overwrite count relative to the viewer's existing list. `existingIds`
// is a Set of IDs (as strings) already in the viewer's list.
export const summarizeImport = (malItems, existingIds = new Set()) => {
  const summary = {
    total: 0,
    skipped: 0,
    unsupported: 0,
    byStatus: {
      watching: 0,
      completed: 0,
      on_hold: 0,
      dropped: 0,
      plan: 0,
    },
    withRating: 0,
  };
  if (!Array.isArray(malItems)) return summary;
  for (const item of malItems) {
    const payload = toImportPayload(item);
    if (!payload) {
      summary.unsupported += 1;
      continue;
    }
    if (existingIds.has(String(payload.anime.id))) {
      summary.skipped += 1;
      continue;
    }
    summary.total += 1;
    summary.byStatus[payload.options.status] += 1;
    if (payload.options.rating !== undefined) summary.withRating += 1;
  }
  return summary;
};

// Resolves which favourites will actually be imported, honouring the 10-per-
// category cap and skipping ones already on file. `existingAnimeFavIds` /
// `existingCharFavIds` are sets of IDs (as strings or numbers) already
// favourited. `importedAnimeIds` lets us drop anime favourites that aren't
// getting imported (either not in MAL's list or already in our list with
// some other state — we only flip the favourite on freshly-imported ones).
export const planFavoriteImport = ({
  animeFavorites,
  characterFavorites,
  importedAnimeIds,
  existingAnimeFavCount,
  existingCharFavIds,
  existingCharFavCount,
  limit,
}) => {
  const animeFavSlots = Math.max(0, (limit ?? 10) - (existingAnimeFavCount ?? 0));
  const charFavSlots = Math.max(0, (limit ?? 10) - (existingCharFavCount ?? 0));

  const animeFavSet = favoriteAnimeIds(animeFavorites);
  const animeToFlag = [];
  for (const malId of animeFavSet) {
    if (animeToFlag.length >= animeFavSlots) break;
    if (!importedAnimeIds.has(String(malId))) continue;
    animeToFlag.push(String(malId));
  }

  const charPayloads = [];
  if (Array.isArray(characterFavorites)) {
    for (const entry of characterFavorites) {
      if (charPayloads.length >= charFavSlots) break;
      const payload = toFavoriteCharacterPayload(entry);
      if (!payload) continue;
      if (existingCharFavIds?.has(payload.id)) continue;
      charPayloads.push(payload);
    }
  }

  return {
    animeFavoriteIds: new Set(animeToFlag),
    characters: charPayloads,
    skippedAnime: animeFavSet.size - animeToFlag.length,
    skippedChars: Array.isArray(characterFavorites)
      ? characterFavorites.length - charPayloads.length
      : 0,
  };
};
