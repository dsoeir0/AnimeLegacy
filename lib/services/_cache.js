const store = new Map();
const now = () => Date.now();

export const cached = async (key, ttlMs, fetcher) => {
  const hit = store.get(key);
  if (hit && hit.expiresAt > now()) return hit.data;

  try {
    const data = await fetcher();
    store.set(key, { data, expiresAt: now() + ttlMs });
    return data;
  } catch (err) {
    if (hit) return hit.data;
    throw err;
  }
};

export const MISS = Symbol('cache-miss');

export const peek = (key) => {
  const hit = store.get(key);
  if (!hit || hit.expiresAt <= now()) return MISS;
  return hit.data;
};

export const put = (key, ttlMs, data) => {
  store.set(key, { data, expiresAt: now() + ttlMs });
};

export const __resetCacheForTests = () => {
  store.clear();
};
