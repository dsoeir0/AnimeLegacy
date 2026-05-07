import { MISS, peek, put } from './_cache';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

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
    // partial result is fine
  }
  return result;
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
