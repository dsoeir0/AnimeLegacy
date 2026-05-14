const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const ta = typeof a;
  if (ta !== typeof b) return false;
  if (ta !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
};

export const createSubscriberStore = (subscribeFn) => {
  const subscribers = new Map();
  const cache = new Map();
  const unsubscribers = new Map();

  const subscribe = (key, cb) => {
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
      const unsub = subscribeFn(key, (data) => {
        const prev = cache.has(key) ? cache.get(key) : undefined;
        if (cache.has(key) && deepEqual(prev, data)) return;
        cache.set(key, data);
        const subs = subscribers.get(key);
        if (subs) subs.forEach((s) => s(data));
      });
      unsubscribers.set(key, unsub);
    }
    const set = subscribers.get(key);
    set.add(cb);
    if (cache.has(key)) cb(cache.get(key));

    return () => {
      const subs = subscribers.get(key);
      if (!subs) return;
      subs.delete(cb);
      if (subs.size === 0) {
        const unsub = unsubscribers.get(key);
        if (unsub) unsub();
        subscribers.delete(key);
        unsubscribers.delete(key);
        cache.delete(key);
      }
    };
  };

  const peek = (key) => (key && cache.has(key) ? cache.get(key) : null);

  return { subscribe, peek };
};
