import { isAiringAnime } from './anime';

const EPISODE_MINUTES = 24;

const normalizeStatus = (item) =>
  isAiringAnime(item) && item?.status === 'completed' ? 'watching' : item?.status;

export const computeStats = (items) => {
  const safeItems = Array.isArray(items) ? items : [];
  const watchedCount = safeItems.filter(
    (item) => normalizeStatus(item) === 'completed',
  ).length;

  const totalEpisodes = safeItems.reduce((sum, item) => {
    if (typeof item?.progress === 'number') return sum + item.progress;
    if (normalizeStatus(item) === 'completed' && typeof item?.episodesTotal === 'number') {
      return sum + item.episodesTotal;
    }
    return sum;
  }, 0);

  const daysSpent = (totalEpisodes * EPISODE_MINUTES) / 60 / 24;

  const scored = safeItems.filter((item) => typeof item?.rating === 'number');
  const myAvgScore = scored.length
    ? scored.reduce((sum, item) => sum + item.rating, 0) / scored.length
    : null;

  const malScored = safeItems.filter((item) => typeof item?.malScore === 'number');
  const malAvgScore = malScored.length
    ? malScored.reduce((sum, item) => sum + item.malScore, 0) / malScored.length
    : null;

  const reviewCount = safeItems.filter(
    (item) => typeof item?.review === 'string' && item.review.trim().length > 0,
  ).length;

  return {
    watchedCount,
    totalEpisodes,
    daysSpent,
    myAvgScore,
    malAvgScore,
    reviewCount,
  };
};

export const computeGenres = (items) => {
  const safeItems = Array.isArray(items) ? items : [];
  const tally = new Map();
  safeItems.forEach((item) => {
    if (!Array.isArray(item?.genres)) return;
    item.genres.forEach((genre) => {
      const key = String(genre);
      tally.set(key, (tally.get(key) || 0) + 1);
    });
  });
  return Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
};

export const computeMeanScoreWithSigma = (items) => {
  const safeItems = Array.isArray(items) ? items : [];
  const scored = safeItems
    .filter((item) => typeof item?.rating === 'number' && Number.isFinite(item.rating))
    .map((item) => item.rating);
  if (scored.length === 0) return { mean: null, sigma: null, count: 0 };
  const mean = scored.reduce((sum, n) => sum + n, 0) / scored.length;
  const variance = scored.reduce((sum, n) => sum + (n - mean) ** 2, 0) / scored.length;
  return { mean, sigma: Math.sqrt(variance), count: scored.length };
};

export const computeRatingHistogram = (items, bins = 5) => {
  const safeItems = Array.isArray(items) ? items : [];
  const counts = Array.from({ length: bins }, (_, i) => ({ score: i + 1, count: 0 }));
  for (const item of safeItems) {
    if (typeof item?.rating !== 'number' || !Number.isFinite(item.rating)) continue;
    if (item.rating <= 0) continue;
    const idx = Math.min(bins - 1, Math.max(0, Math.round(item.rating) - 1));
    counts[idx].count += 1;
  }
  return counts;
};

export const computeRecentEntries = (items, limit = 6) => {
  const safeItems = Array.isArray(items) ? items : [];
  const ts = (item) => {
    const value = item?.updatedAt ?? item?.addedAt;
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };
  return [...safeItems].sort((a, b) => ts(b) - ts(a)).slice(0, limit);
};

export const countCompletedInDays = (items, days = 30, now = Date.now()) => {
  const safeItems = Array.isArray(items) ? items : [];
  const cutoff = now - days * 86400000;
  return safeItems.filter((item) => {
    if (normalizeStatus(item) !== 'completed') return false;
    const value = item?.updatedAt ?? item?.addedAt;
    if (!value) return false;
    const ms = typeof value?.toMillis === 'function' ? value.toMillis() : new Date(value).getTime();
    return Number.isFinite(ms) && ms >= cutoff;
  }).length;
};
