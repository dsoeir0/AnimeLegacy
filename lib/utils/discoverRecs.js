const genreName = (g) => (typeof g === 'string' ? g : g?.name || '');

export const candidatePool = (list) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const watching = list.filter((e) => e?.status === 'watching');
  return watching.length > 0 ? watching : list;
};

export const pickRandomAnchor = (pool, excludeId, rng = Math.random) => {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const eligible = excludeId
    ? pool.filter((e) => Number(e?.id) !== Number(excludeId))
    : pool;
  const source = eligible.length > 0 ? eligible : pool;
  return source[Math.floor(rng() * source.length)] || null;
};

export const fallbackByGenre = (anchor, pool, blockedIds) => {
  if (!anchor || !Array.isArray(pool)) return [];
  const anchorGenres = new Set(
    (Array.isArray(anchor.genres) ? anchor.genres : [])
      .map(genreName)
      .filter(Boolean),
  );
  if (anchorGenres.size === 0) return [];
  const blocked = blockedIds instanceof Set ? blockedIds : new Set(blockedIds);
  return pool.filter(
    (a) =>
      Number.isFinite(a?.mal_id) &&
      !blocked.has(Number(a.mal_id)) &&
      Array.isArray(a.genres) &&
      a.genres.some((g) => anchorGenres.has(genreName(g))),
  );
};

export const pickUniqueBanners = (moods, postersByMood) => {
  const claimed = new Set();
  const result = {};
  for (const mood of moods) {
    const posters = postersByMood?.[mood.id] || [];
    let chosen = null;
    for (const poster of posters) {
      if (!poster?.mal_id || claimed.has(poster.mal_id)) continue;
      chosen = poster;
      break;
    }
    if (!chosen && posters.length > 0) chosen = posters[0];
    if (chosen?.mal_id) claimed.add(chosen.mal_id);
    result[mood.id] = chosen;
  }
  return result;
};

export const truncateTitleList = (posters, maxChars = 20) =>
  (Array.isArray(posters) ? posters : [])
    .map((p) => p?.title || '')
    .filter(Boolean)
    .map((t) => (t.length > maxChars ? `${t.slice(0, maxChars)}…` : t))
    .join(', ');
