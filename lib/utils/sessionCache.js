export const createSessionCache = ({ ttlMs, max, now = () => Date.now() } = {}) => {
  const cache = new Map();
  const inflight = new Map();
  const limit = Number.isFinite(max) && max > 0 ? max : 50;
  const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 5 * 60 * 1000;

  const get = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (now() > entry.expires) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  };

  const set = (key, value) => {
    if (cache.size >= limit && !cache.has(key)) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { value, expires: now() + ttl });
  };

  const withInflight = (key, fetcher) => {
    const cached = get(key);
    if (cached !== null) return Promise.resolve(cached);
    let promise = inflight.get(key);
    if (!promise) {
      promise = (async () => {
        const value = await fetcher();
        set(key, value);
        return value;
      })();
      inflight.set(key, promise);
      promise.finally(() => inflight.delete(key));
    }
    return promise;
  };

  return { get, set, withInflight };
};
