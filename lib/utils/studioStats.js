// Pure helpers that turn a studio's anime filmography (as returned by Jikan
// /anime?producers={id}) into the aggregate stats rendered on the studio
// detail page — average score, score histogram, top genres, airing status
// buckets. Kept pure so the page stays dumb and we can unit-test the
// number-crunching without mocking Jikan.

// Mean `score` of entries that have a numeric score.
export const avgScore = (animeList) => {
  if (!Array.isArray(animeList)) return null;
  const scored = animeList.filter((a) => Number.isFinite(a?.score));
  if (!scored.length) return null;
  return scored.reduce((sum, a) => sum + a.score, 0) / scored.length;
};

// Number of entries whose `airing` flag is true OR status says "Currently
// Airing". Jikan sometimes leaves `airing: false` on shows that just
// transitioned to "Not yet aired" so we check both.
export const countAiring = (animeList) => {
  if (!Array.isArray(animeList)) return 0;
  return animeList.filter(
    (a) =>
      a?.airing === true ||
      (typeof a?.status === 'string' && /currently airing/i.test(a.status)),
  ).length;
};

// Entries that haven't aired yet — "Not yet aired" in Jikan's status field.
// Used by the "What's next" block on the detail page.
export const upcomingAnime = (animeList) => {
  if (!Array.isArray(animeList)) return [];
  return animeList.filter(
    (a) => typeof a?.status === 'string' && /not yet aired/i.test(a.status),
  );
};

// Histogram of scores bucketed into 10 slots (0–1, 1–2, …, 9–10).
// Returns a 10-length array of counts. Entries without a numeric score are
// dropped. Values of exactly 10 fall in the last bucket.
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

// Quartile-ish highlights for the score distribution card:
// - median, percentageAbove8, best
// Returns nulls when the list has no scored entries.
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

// Aggregates genres across the filmography and returns the top `limit` by
// frequency. Ties broken by the first appearance in the input. Genres are
// flattened from Jikan's `[{ mal_id, name, … }]` shape.
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

// Group productions by year for the timeline view. Returns an array of
// `{ year, anime: [...] }` sorted newest-first. Entries without a year
// bucket under `year: null` at the bottom.
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
