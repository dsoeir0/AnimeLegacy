// All axes use 0–100. Higher = chaotic / bleak / sprawling. Coarse on purpose.

const PACE_GENRE_WEIGHT = {
  Action: 22,
  Adventure: 10,
  Comedy: 8,
  'Sci-Fi': 5,
  Sports: 18,
  Horror: 18,
  Thriller: 15,
  Suspense: 15,
  Mystery: -2,
  Drama: -10,
  Romance: -14,
  'Slice of Life': -30,
  Iyashikei: -28,
  Music: -18,
  'Girls Love': -12,
  'Boys Love': -12,
};

const TONE_GENRE_WEIGHT = {
  Horror: 32,
  Psychological: 26,
  Drama: 18,
  Thriller: 16,
  Suspense: 14,
  Tragedy: 25,
  Mystery: 10,
  Action: 4,
  Seinen: 6,
  Comedy: -24,
  Parody: -22,
  'Slice of Life': -20,
  Iyashikei: -30,
  Romance: -10,
  'Magical Sex Shift': -6,
  Sports: -6,
  Kids: -18,
};

const TYPE_BASE_PACE = {
  TV: 40,
  Movie: 55,
  OVA: 40,
  ONA: 45,
  Special: 45,
  Music: 25,
};

const parseDuration = (str) => {
  if (typeof str !== 'string') return null;
  const m = str.match(/(\d+)\s*hr(?:\s*(\d+)\s*min)?|(\d+)\s*min/);
  if (!m) return null;
  if (m[1]) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
  return Number(m[3]);
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const genreNames = (anime) => {
  if (!Array.isArray(anime?.genres)) return [];
  return anime.genres
    .map((g) => (typeof g === 'string' ? g : g?.name))
    .filter(Boolean);
};

export const coordsForAnime = (anime) => {
  if (!anime || typeof anime !== 'object') return { pace: 50, tone: 50, length: 50 };

  const type = typeof anime.type === 'string' ? anime.type : '';
  const genres = genreNames(anime);

  let pace = TYPE_BASE_PACE[type] ?? 45;
  let tone = 45;
  for (const g of genres) {
    pace += PACE_GENRE_WEIGHT[g] ?? 0;
    tone += TONE_GENRE_WEIGHT[g] ?? 0;
  }

  // Length dimension — rough "total runtime" score. Movies weighted like
  // a short TV season so a 2h film lands mid-scale rather than at zero.
  const episodes = Number.isFinite(anime.episodes) ? anime.episodes : null;
  const perEp = parseDuration(anime.duration);
  let length;
  if (type === 'Movie') {
    const total = perEp ?? 100;
    // 1h → 25, 2h → 50, 3h → 75
    length = clamp(total * 0.42);
  } else if (episodes) {
    // 12 eps → 30, 24 → 50, 50 → 75, 100+ → 90+
    length = clamp(20 + episodes * 1.1);
  } else {
    length = 45;
  }

  return {
    pace: clamp(pace),
    tone: clamp(tone),
    length,
  };
};

export const vibeDistance = (anime, target) => {
  const c = coordsForAnime(anime);
  const dp = (c.pace - (target.pace ?? 50));
  const dt = (c.tone - (target.tone ?? 50));
  const dl = (c.length - (target.length ?? 50));
  return Math.sqrt(dp * dp + dt * dt + dl * dl);
};

export const vibeMatch = (anime, target) => {
  const dist = vibeDistance(anime, target);
  return Math.max(60, Math.round(100 - dist * 0.55));
};

export const rankByVibe = (pool, target, limit = 4) => {
  if (!Array.isArray(pool)) return [];
  return pool
    .map((a) => ({ anime: a, match: vibeMatch(a, target), dist: vibeDistance(a, target) }))
    .sort((x, y) => x.dist - y.dist)
    .slice(0, limit);
};
