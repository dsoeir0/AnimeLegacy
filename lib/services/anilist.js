const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

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

export const fetchAniListMediaByMalIds = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const resultMap = {};
  const chunks = chunkArray(uniqueIds, 25);

  for (const chunk of chunks) {
    const query = buildMediaQuery(chunk);
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const payload = await response.json();
    const data = payload?.data || {};
    Object.values(data).forEach((media) => {
      if (!media?.idMal) return;
      resultMap[media.idMal] = {
        coverImage: media.coverImage,
        bannerImage: media.bannerImage,
      };
    });
  }

  return resultMap;
};
