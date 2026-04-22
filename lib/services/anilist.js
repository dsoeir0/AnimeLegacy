import { MISS, peek, put } from './_cache';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

// Cover/banner URLs are effectively immutable once an anime is published —
// AniList only re-issues them when an entry gets a fresh admin-approved
// artwork swap. 6h is overkill-safe and keeps hit rate near 100%.
const COVER_TTL_MS = 6 * 60 * 60 * 1000;
const KEY = (id) => `anilist:media:${id}`;
const CHUNK_SIZE = 25;

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const buildMediaQuery = (ids) => {
  const fields = `
    idMal
    coverImage { extraLarge large }
    bannerImage
  `;
  const entries = ids
    .map((id, index) => `media${index}: Media(idMal: ${id}, type: ANIME) { ${fields} }`)
    .join('\n');
  return `query { ${entries} }`;
};

const fetchChunk = async (chunk) => {
  const result = {};
  try {
    const query = buildMediaQuery(chunk);
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
      };
    });
  } catch {
    // Ignore AniList errors for this chunk — returning partial is fine.
  }
  return result;
};

export const fetchAniListMediaByMalIds = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const resultMap = {};
  const coldIds = [];

  // Phase 1: split cached IDs from cold ones without touching the network.
  for (const id of uniqueIds) {
    const hit = peek(KEY(id));
    if (hit === MISS) {
      coldIds.push(id);
    } else if (hit) {
      resultMap[id] = hit;
    }
    // If hit is null, we previously cached the "AniList returned nothing"
    // result for this ID — leave it out of resultMap (same shape as before
    // caching existed) and don't re-fetch.
  }

  // Phase 2: batch-fetch the cold IDs 25 at a time (AniList's sweet spot).
  if (coldIds.length > 0) {
    const chunks = chunkArray(coldIds, CHUNK_SIZE);
    for (const chunk of chunks) {
      const chunkResult = await fetchChunk(chunk);
      for (const id of chunk) {
        const data = chunkResult[id] || null;
        put(KEY(id), COVER_TTL_MS, data);
        if (data) resultMap[id] = data;
      }
    }
  }

  return resultMap;
};
