const MAX_ITEMS = 5000;
const PAGE_SIZE = 300;
const MAL_UA = 'Mozilla/5.0 (compatible; AnimeLegacy/1.0)';

const cleanUsername = (raw) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9_-]{2,16}$/.test(trimmed)) return null;
  return trimmed;
};

const fetchFavorites = async (username) => {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/users/${encodeURIComponent(username)}/favorites`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return { anime: [], characters: [] };
    const body = await res.json();
    const data = body?.data || {};
    return {
      anime: Array.isArray(data.anime) ? data.anime : [],
      characters: Array.isArray(data.characters) ? data.characters : [],
    };
  } catch {
    return { anime: [], characters: [] };
  }
};

const fetchPage = async (username, offset) => {
  const url = `https://myanimelist.net/animelist/${encodeURIComponent(username)}/load.json?status=7&offset=${offset}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': MAL_UA, Accept: 'application/json' },
  });
  if (res.status === 400 || res.status === 404) {
    return { notFound: true };
  }
  if (res.status === 403) {
    return { forbidden: true };
  }
  if (!res.ok) {
    return { error: `mal_status_${res.status}` };
  }
  // non-array body usually means MAL bot check or private profile
  let body;
  try {
    body = await res.json();
  } catch {
    return { error: 'mal_parse_failed' };
  }
  if (!Array.isArray(body)) {
    return { forbidden: true };
  }
  return { items: body };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const username = cleanUsername(req.query.username);
  if (!username) {
    return res.status(400).json({ error: 'invalid_username' });
  }

  const items = [];
  let offset = 0;
  try {
    while (items.length < MAX_ITEMS) {
      const page = await fetchPage(username, offset);
      if (page.notFound) {
        return res.status(404).json({ error: 'user_not_found' });
      }
      if (page.forbidden) {
        return res.status(403).json({ error: 'list_private' });
      }
      if (page.error) {
        return res.status(502).json({ error: page.error });
      }
      if (!page.items.length) break;
      items.push(...page.items);
      if (page.items.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    const favorites = await fetchFavorites(username);
    return res.status(200).json({
      username,
      count: items.length,
      items,
      favorites,
    });
  } catch {
    return res.status(502).json({ error: 'mal_network_failed' });
  }
}
