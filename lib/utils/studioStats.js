export const avgScore = (animeList) => {
  if (!Array.isArray(animeList)) return null;
  const scored = animeList.filter((a) => Number.isFinite(a?.score));
  if (!scored.length) return null;
  return scored.reduce((sum, a) => sum + a.score, 0) / scored.length;
};

export const countAiring = (animeList) => {
  if (!Array.isArray(animeList)) return 0;
  return animeList.filter(
    (a) =>
      a?.airing === true ||
      (typeof a?.status === 'string' && /currently airing/i.test(a.status)),
  ).length;
};

export const upcomingAnime = (animeList) => {
  if (!Array.isArray(animeList)) return [];
  return animeList.filter(
    (a) => typeof a?.status === 'string' && /not yet aired/i.test(a.status),
  );
};

export const scoreHistogram = (animeList) => {
  const buckets = Array(10).fill(0);
  if (!Array.isArray(animeList)) return buckets;
  for (const a of animeList) {
    if (!Number.isFinite(a?.score)) continue;
    const idx = a.score >= 10 ? 9 : Math.max(0, Math.floor(a.score));
    buckets[idx] += 1;
  }
  return buckets;
};

export const scoreHighlights = (animeList) => {
  if (!Array.isArray(animeList)) {
    return { median: null, percentAbove8: null, best: null };
  }
  const scores = animeList
    .map((a) => a?.score)
    .filter((s) => Number.isFinite(s))
    .sort((a, b) => a - b);
  if (!scores.length) {
    return { median: null, percentAbove8: null, best: null };
  }
  const mid = Math.floor(scores.length / 2);
  const median =
    scores.length % 2 === 0
      ? (scores[mid - 1] + scores[mid]) / 2
      : scores[mid];
  const above8 = scores.filter((s) => s >= 8).length;
  const percentAbove8 = Math.round((above8 / scores.length) * 100);
  const best = scores[scores.length - 1];
  return { median, percentAbove8, best };
};

export const topGenres = (animeList, limit = 6) => {
  if (!Array.isArray(animeList)) return [];
  const counts = new Map();
  const order = [];
  for (const a of animeList) {
    if (!Array.isArray(a?.genres)) continue;
    for (const g of a.genres) {
      const name = typeof g === 'string' ? g : g?.name;
      if (!name) continue;
      if (!counts.has(name)) order.push(name);
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return order
    .map((name) => ({ name, count: counts.get(name) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const groupByYear = (animeList) => {
  if (!Array.isArray(animeList)) return [];
  const groups = new Map();
  for (const a of animeList) {
    const year =
      Number.isFinite(a?.year)
        ? a.year
        : a?.aired?.prop?.from?.year || null;
    const key = Number.isFinite(year) ? year : null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  return Array.from(groups.entries())
    .sort(([aYear], [bYear]) => {
      if (aYear === null) return 1;
      if (bYear === null) return -1;
      return bYear - aYear;
    })
    .map(([year, anime]) => ({ year, anime }));
};
