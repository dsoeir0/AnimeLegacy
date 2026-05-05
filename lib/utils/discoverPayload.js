import { DISCOVER_MOODS } from '../../components/discover/moods';
import { slimAnimeForDiscover } from './anime';

export const buildDiscoverPayload = (topList) => {
  const safe = Array.isArray(topList) ? topList : [];

  const primary = safe[0] ? slimAnimeForDiscover(safe[0]) : null;
  const secondary = safe.slice(1, 3).map(slimAnimeForDiscover);

  // popularity rank ascending = least popular first.
  const gems = safe
    .filter((a) => typeof a?.score === 'number' && a.score >= 8)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 4)
    .map(slimAnimeForDiscover);

  const vibePool = safe.slice(0, 20).map(slimAnimeForDiscover);

  const moodPosters = {};
  for (const mood of DISCOVER_MOODS) {
    const moodGenres = new Set(
      (mood.query.match(/genres=([\d,]+)/)?.[1] || '')
        .split(',')
        .map((id) => Number(id))
        .filter(Boolean),
    );
    moodPosters[mood.id] = safe
      .filter(
        (a) =>
          Array.isArray(a?.genres) &&
          a.genres.some((g) => moodGenres.has(Number(g?.mal_id))),
      )
      .slice(0, 3)
      .map(slimAnimeForDiscover);
  }

  return { primary, secondary, gems, vibePool, moodPosters };
};
