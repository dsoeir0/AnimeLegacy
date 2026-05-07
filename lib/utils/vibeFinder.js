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

const WORLD_GENRE_WEIGHT = {
  Fantasy: 30,
  Magic: 28,
  Isekai: 30,
  Mythology: 25,
  Supernatural: 25,
  Demons: 22,
  Vampire: 20,
  'Sci-Fi': 22,
  Mecha: 20,
  Space: 20,
  'Time Travel': 20,
  'Super Power': 18,
  'Magical Sex Shift': 18,
  'Slice of Life': -28,
  Sports: -28,
  Iyashikei: -22,
  Gourmet: -25,
  Workplace: -25,
  Historical: -18,
  Music: -18,
  School: -15,
  Romance: -8,
  Drama: -10,
  Josei: -10,
  'Adult Cast': -10,
};

const TYPE_BASE_PACE = {
  TV: 40,
  Movie: 55,
  OVA: 40,
  ONA: 45,
  Special: 45,
  Music: 25,
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const genreNames = (anime) => {
  if (!Array.isArray(anime?.genres)) return [];
  return anime.genres
    .map((g) => (typeof g === 'string' ? g : g?.name))
    .filter(Boolean);
};

export const coordsForAnime = (anime) => {
  if (!anime || typeof anime !== 'object') return { pace: 50, tone: 50, world: 50 };

  const type = typeof anime.type === 'string' ? anime.type : '';
  const genres = genreNames(anime);

  let pace = TYPE_BASE_PACE[type] ?? 45;
  let tone = 45;
  let world = 50;
  for (const g of genres) {
    pace += PACE_GENRE_WEIGHT[g] ?? 0;
    tone += TONE_GENRE_WEIGHT[g] ?? 0;
    world += WORLD_GENRE_WEIGHT[g] ?? 0;
  }

  return {
    pace: clamp(pace),
    tone: clamp(tone),
    world: clamp(world),
  };
};

export const vibeDistance = (anime, target) => {
  const c = coordsForAnime(anime);
  const dp = c.pace - (target.pace ?? 50);
  const dt = c.tone - (target.tone ?? 50);
  const dw = c.world - (target.world ?? 50);
  return Math.sqrt(dp * dp + dt * dt + dw * dw);
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
