import { filterOutHentai } from '../utils/anime';
import {
  searchAnime,
  searchCharacters,
  searchPeople,
  searchProducers,
} from './jikan';
import { createSessionCache } from '../utils/sessionCache';

export const EMPTY_CATEGORY_RESULTS = {
  anime: [],
  characters: [],
  people: [],
  studios: [],
  totals: { anime: 0, characters: 0, people: 0, studios: 0 },
};

const cache = createSessionCache({ ttlMs: 5 * 60 * 1000, max: 50 });

const safeArray = (res) =>
  !res?.error && Array.isArray(res?.data) ? res.data : [];

const totalOf = (res) =>
  Number.isFinite(res?.pagination?.items?.total) ? res.pagination.items.total : 0;

export const fetchCategorizedResults = (query, limit = 5) =>
  cache.withInflight(`${limit}:${query}`, async () => {
    const [animeRes, charRes, peopleRes, prodRes] = await Promise.all([
      searchAnime(query, 1, limit),
      searchCharacters(query, 1, limit),
      searchPeople(query, 1, limit),
      searchProducers(query, 1, limit),
    ]);
    return {
      anime: filterOutHentai(safeArray(animeRes)),
      characters: safeArray(charRes),
      people: safeArray(peopleRes),
      studios: safeArray(prodRes),
      totals: {
        anime: totalOf(animeRes),
        characters: totalOf(charRes),
        people: totalOf(peopleRes),
        studios: totalOf(prodRes),
      },
    };
  });
