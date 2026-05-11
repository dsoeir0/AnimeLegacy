import { describe, it, expect, vi } from 'vitest';
import { createSessionCache } from '../lib/utils/sessionCache.js';

describe('createSessionCache', () => {
  it('returns null for an unknown key', () => {
    const cache = createSessionCache();
    expect(cache.get('missing')).toBeNull();
  });

  it('returns the stored value while within TTL', () => {
    let t = 0;
    const cache = createSessionCache({ ttlMs: 1000, now: () => t });
    cache.set('a', 'value');
    t = 500;
    expect(cache.get('a')).toBe('value');
  });

  it('expires entries after the TTL', () => {
    let t = 0;
    const cache = createSessionCache({ ttlMs: 1000, now: () => t });
    cache.set('a', 'value');
    t = 1001;
    expect(cache.get('a')).toBeNull();
  });

  it('evicts the oldest entry when over the max', () => {
    const cache = createSessionCache({ ttlMs: 60000, max: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('does not evict when updating an existing key', () => {
    const cache = createSessionCache({ ttlMs: 60000, max: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 99);
    expect(cache.get('a')).toBe(99);
    expect(cache.get('b')).toBe(2);
  });

  describe('withInflight', () => {
    it('returns the cached value without calling the fetcher', async () => {
      const cache = createSessionCache();
      cache.set('a', 'cached');
      const fetcher = vi.fn();
      const result = await cache.withInflight('a', fetcher);
      expect(result).toBe('cached');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('dedupes concurrent calls for the same key', async () => {
      const cache = createSessionCache();
      let resolve;
      const fetcher = vi.fn(() => new Promise((r) => { resolve = r; }));
      const a = cache.withInflight('k', fetcher);
      const b = cache.withInflight('k', fetcher);
      resolve('value');
      const [r1, r2] = await Promise.all([a, b]);
      expect(r1).toBe('value');
      expect(r2).toBe('value');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('caches the resolved value for subsequent calls', async () => {
      const cache = createSessionCache();
      const fetcher = vi.fn(() => Promise.resolve('first'));
      await cache.withInflight('k', fetcher);
      await cache.withInflight('k', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('fetches again after TTL expires', async () => {
      let t = 0;
      const cache = createSessionCache({ ttlMs: 1000, now: () => t });
      const fetcher = vi.fn(() => Promise.resolve('value'));
      await cache.withInflight('k', fetcher);
      t = 2000;
      await cache.withInflight('k', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
