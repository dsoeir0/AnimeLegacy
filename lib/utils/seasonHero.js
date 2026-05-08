export const SPARSE_HERO_THRESHOLD = 4;

export const hasScoreSignal = (items) => items.some((i) => Number(i?.score) > 0);

export const isSparseHero = (items) => items.length <= SPARSE_HERO_THRESHOLD;

const byScoreDesc = (a, b) => (Number(b?.score) || 0) - (Number(a?.score) || 0);
const byPopularityAsc = (a, b) => (a?.popularity || 999999) - (b?.popularity || 999999);

const sortHero = (items, scored) =>
  [...items].sort(scored ? byScoreDesc : byPopularityAsc);

export const pickEditor = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return sortHero(items, hasScoreSignal(items))[0];
};

export const pickTopThree = (items, excludeId) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  return sortHero(
    items.filter((i) => i?.mal_id !== excludeId),
    hasScoreSignal(items),
  ).slice(0, 3);
};
