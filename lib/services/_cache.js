// In-memory because the Node process is long-lived. Swap for Upstash if we
// ever go multi-instance — `cached(key, ttlMs, fetcher)` is a drop-in slot.

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
    // Serve stale on origin failure if we have something — better a slightly
    // old page than a blank one during a Jikan 429 storm.
    if (hit) return hit.data;
    throw err;
  }
};

// Lower-level access for batch-oriented callers (e.g. AniList's 25-at-a-time
// GraphQL queries). `peek` returns the sentinel `MISS` for absent/expired
// entries — using a symbol instead of `undefined` lets callers cache a
// legitimate `null` value (e.g. "AniList has no data for this MAL ID").
export const MISS = Symbol('cache-miss');

export const peek = (key) => {
  const hit = store.get(key);
  if (!hit || hit.expiresAt <= now()) return MISS;
  return hit.data;
};

export const put = (key, ttlMs, data) => {
  store.set(key, { data, expiresAt: now() + ttlMs });
};

// Test-only helper: wipe the store between specs. Not exported from an index
// on purpose — tests import it directly.
export const __resetCacheForTests = () => {
  store.clear();
};
