// Unit tests for the shared service cache. Pure in-memory, no emulator.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cached, __resetCacheForTests } from '../lib/services/_cache';

beforeEach(() => {
  __resetCacheForTests();
  vi.useRealTimers();
});

describe('cached', () => {
  it('calls the fetcher on a cold key and caches the result', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 });
    const a = await cached('anime:1', 1000, fetcher);
    const b = await cached('anime:1', 1000, fetcher);
    expect(a).toEqual({ id: 1 });
    expect(b).toEqual({ id: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the TTL expires', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const first = await cached('key', 100, fetcher);
    vi.advanceTimersByTime(150);
    const second = await cached('key', 100, fetcher);

    expect(first).toEqual({ v: 1 });
    expect(second).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves the previous value when the fetcher fails on refresh (stale-on-error)', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockRejectedValueOnce(new Error('Jikan 429'));

    const first = await cached('key', 100, fetcher);
    vi.advanceTimersByTime(150);
    const second = await cached('key', 100, fetcher);

    expect(first).toEqual({ v: 1 });
    expect(second).toEqual({ v: 1 }); // stale served instead of throwing
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('propagates the error when there is no prior value to serve', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('cold miss'));
    await expect(cached('never-seen', 1000, fetcher)).rejects.toThrow('cold miss');
  });

  it('keeps different keys independent', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ id: 'a' })
      .mockResolvedValueOnce({ id: 'b' });

    expect(await cached('a', 1000, fetcher)).toEqual({ id: 'a' });
    expect(await cached('b', 1000, fetcher)).toEqual({ id: 'b' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('peek / put (lower-level)', () => {
  it('returns MISS for unknown and expired keys', async () => {
    const { peek, put, MISS } = await import('../lib/services/_cache');
    expect(peek('never')).toBe(MISS);

    vi.useFakeTimers();
    put('short', 10, { v: 1 });
    expect(peek('short')).toEqual({ v: 1 });
    vi.advanceTimersByTime(50);
    expect(peek('short')).toBe(MISS);
  });

  it('distinguishes a cached null from a miss (sentinel)', async () => {
    const { peek, put, MISS } = await import('../lib/services/_cache');
    put('nullable', 1000, null);
    expect(peek('nullable')).toBeNull();
    expect(peek('nullable')).not.toBe(MISS);
  });
});
