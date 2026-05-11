import { toJsDate } from './profileActivity';

export const SENTIMENT_BUCKETS = [
  { key: 'loved', min: 4.5, max: 5.01 },
  { key: 'liked', min: 3.5, max: 4.5 },
  { key: 'mixed', min: 2.5, max: 3.5 },
  { key: 'disliked', min: 0, max: 2.5 },
  { key: 'unrated', min: null, max: null },
];

export const groupReviewsBySentiment = (reviews) => {
  const groups = Object.fromEntries(SENTIMENT_BUCKETS.map((b) => [b.key, []]));
  (reviews || []).forEach((entry) => {
    if (typeof entry?.rating !== 'number') {
      groups.unrated.push(entry);
      return;
    }
    const bucket = SENTIMENT_BUCKETS.find(
      (b) => b.min !== null && entry.rating >= b.min && entry.rating < b.max,
    );
    if (bucket) groups[bucket.key].push(entry);
  });
  return groups;
};

export const wordCount = (text) =>
  typeof text === 'string' && text.trim() ? text.trim().split(/\s+/).length : 0;

const ts = (entry) => {
  const d = toJsDate(entry?.updatedAt ?? entry?.addedAt);
  return d ? d.getTime() : 0;
};

export const sortReviews = (reviews, mode) => {
  const list = [...(reviews || [])];
  switch (mode) {
    case 'highest':
      return list.sort((a, b) => (b?.rating ?? -Infinity) - (a?.rating ?? -Infinity));
    case 'lowest':
      return list.sort((a, b) => (a?.rating ?? Infinity) - (b?.rating ?? Infinity));
    case 'longest':
      return list.sort((a, b) => wordCount(b?.review) - wordCount(a?.review));
    case 'newest':
    default:
      return list.sort((a, b) => ts(b) - ts(a));
  }
};

export const filterReviewsByText = (reviews, query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return reviews || [];
  return (reviews || []).filter((entry) => {
    const title = String(entry?.title || '').toLowerCase();
    const text = String(entry?.review || '').toLowerCase();
    return title.includes(q) || text.includes(q);
  });
};

export const filterReviewsByYear = (reviews, year) => {
  if (!year || year === 'all') return reviews || [];
  const target = Number(year);
  if (!Number.isFinite(target)) return reviews || [];
  return (reviews || []).filter((entry) => {
    const d = toJsDate(entry?.updatedAt ?? entry?.addedAt);
    return d && d.getFullYear() === target;
  });
};

export const collectReviewYears = (reviews) => {
  const years = new Set();
  (reviews || []).forEach((entry) => {
    const d = toJsDate(entry?.updatedAt ?? entry?.addedAt);
    if (d) years.add(d.getFullYear());
  });
  return Array.from(years).sort((a, b) => b - a);
};

export const computeReviewsStats = (reviews) => {
  const safe = Array.isArray(reviews) ? reviews : [];
  const ratings = safe.map((e) => e?.rating).filter((r) => typeof r === 'number');
  const reviewTexts = safe.map((e) => e?.review).filter((r) => typeof r === 'string' && r.trim());
  const total = safe.length;
  const totalWords = reviewTexts.reduce((sum, r) => sum + wordCount(r), 0);
  const avgWords = reviewTexts.length === 0 ? 0 : Math.round(totalWords / reviewTexts.length);
  const mean = ratings.length === 0 ? null : ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return { total, totalWords, avgWords, mean };
};
