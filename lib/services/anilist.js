import { MISS, peek, put } from './_cache';
import { chunk } from '../utils/chunk';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const COVER_TTL_MS = 6 * 60 * 60 * 1000;
const KEY = (id) => `anilist:media:${id}`;
const CHUNK_SIZE = 25;
const inflight = new Map();

const buildMediaQuery = (ids) => {
  const fields = `
    idMal
    coverImage { extraLarge large }
    bannerImage
    averageScore
    favourites
    popularity
    startDate { year }
  `;
  const entries = ids
    .map((id, index) => `media${index}: Media(idMal: ${id}, type: ANIME) { ${fields} }`)
    .join('\n');
  return `query { ${entries} }`;
};

const fetchChunk = async (ids) => {
  const result = {};
  try {
    const query = buildMediaQuery(ids);
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return result;
    const payload = await response.json();
    const data = payload?.data || {};
    Object.values(data).forEach((media) => {
      if (!media?.idMal) return;
      result[media.idMal] = {
        coverImage: media.coverImage,
        bannerImage: media.bannerImage,
        averageScore: typeof media.averageScore === 'number' ? media.averageScore : null,
        favourites: typeof media.favourites === 'number' ? media.favourites : null,
        popularity: typeof media.popularity === 'number' ? media.popularity : null,
        year: media?.startDate?.year || null,
      };
    });
  } catch {}
  return result;
};

const dedupedFetch = (coldIds) => {
  const perIdPromise = new Map();
  const needsFetch = [];

  for (const id of coldIds) {
    const existing = inflight.get(id);
    if (existing) {
      perIdPromise.set(id, existing);
    } else {
      needsFetch.push(id);
    }
  }

  if (needsFetch.length > 0) {
    const chunks = chunk(needsFetch, CHUNK_SIZE);
    for (const batch of chunks) {
      const chunkPromise = fetchChunk(batch);
      for (const id of batch) {
        const promise = chunkPromise.then((res) => res[id] || null);
        inflight.set(id, promise);
        perIdPromise.set(id, promise);
        promise.finally(() => {
          if (inflight.get(id) === promise) inflight.delete(id);
        });
      }
    }
  }

  return perIdPromise;
};

export const fetchAniListMediaByMalIds = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const resultMap = {};
  const coldIds = [];

  for (const id of uniqueIds) {
    const hit = peek(KEY(id));
    if (hit === MISS) {
      coldIds.push(id);
    } else if (hit) {
      resultMap[id] = hit;
    }
  }

  if (coldIds.length > 0) {
    const promises = dedupedFetch(coldIds);
    const entries = await Promise.all(
      Array.from(promises.entries()).map(async ([id, p]) => [id, await p]),
    );
    for (const [id, data] of entries) {
      put(KEY(id), COVER_TTL_MS, data);
      if (data) resultMap[id] = data;
    }
  }

  return resultMap;
};
