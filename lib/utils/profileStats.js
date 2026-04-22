// Pure aggregators for the profile page, lifted out of useProfileData so they
// can be tested without a React runtime. Do not add Firestore, network, or
// React calls here — keep them pure.

import { isAiringAnime } from './anime';

const EPISODE_MINUTES = 24;

// Airing shows can't be "completed" — they auto-downgrade to watching.
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

// Top 5 genres by count across the items that have a `genres` array. Used by
// the old `topGenres` aside (pre-KPI redesign) — still exported because some
// profile bits consume it.
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
