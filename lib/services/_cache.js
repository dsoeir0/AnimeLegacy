// Simple in-memory TTL cache shared by the external-API services.
//
// Why in-memory (and not Upstash / external KV)?
// The Next.js process runs as a long-lived systemd service on the VPS, so
// a Map kept inside the module persists for the whole uptime of the server
// (typically days to weeks between restarts). Hit rate is very high in
// practice — there's no upside to adding a network round-trip per call.
//
// When to upgrade: if logs show repeated 429s from Jikan correlated with
// process restarts, or if the deployment scales horizontally to multiple
// machines, the `cached(key, ttlMs, fetcher)` signature below is a drop-in
// slot for an Upstash Redis client — replace the Map lookups with
// `await redis.get/setex`.

const store = new Map();

// Mirrors what's inside the Map, documented here so tests don't have to
// reverse-engineer the shape: { data, expiresAt }. `data` is whatever the
// fetcher returned (caller decides the shape).
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
