export const createSubscriberStore = (subscribeFn) => {
  const subscribers = new Map();
  const cache = new Map();
  const unsubscribers = new Map();

  const subscribe = (key, cb) => {
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
      const unsub = subscribeFn(key, (data) => {
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
