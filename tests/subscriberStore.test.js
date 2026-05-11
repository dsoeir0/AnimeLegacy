import { describe, it, expect, vi } from 'vitest';
import { createSubscriberStore } from '../lib/firebase/createSubscriberStore.js';

const fakeBackend = () => {
  const handlers = new Map();
  let listenerCount = 0;
  let lastUnsubscribed = 0;

  const subscribeFn = (key, onValue) => {
    listenerCount += 1;
    handlers.set(key, onValue);
    return () => {
      handlers.delete(key);
      lastUnsubscribed += 1;
    };
  };

  return {
    subscribeFn,
    emit: (key, value) => handlers.get(key)?.(value),
    metrics: () => ({ listenerCount, lastUnsubscribed }),
    isActive: (key) => handlers.has(key),
  };
};

describe('createSubscriberStore', () => {
  it('opens one underlying listener per key, even with many subscribers', () => {
    const backend = fakeBackend();
    const { subscribe } = createSubscriberStore(backend.subscribeFn);
    subscribe('alice', () => {});
    subscribe('alice', () => {});
    subscribe('alice', () => {});
    expect(backend.metrics().listenerCount).toBe(1);
  });

  it('fans out emitted values to every subscriber', () => {
    const backend = fakeBackend();
    const { subscribe } = createSubscriberStore(backend.subscribeFn);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribe('k', cb1);
    subscribe('k', cb2);
    backend.emit('k', { a: 1 });
    expect(cb1).toHaveBeenCalledWith({ a: 1 });
    expect(cb2).toHaveBeenCalledWith({ a: 1 });
  });

  it('immediately fires a new subscriber with the cached value', () => {
    const backend = fakeBackend();
    const { subscribe } = createSubscriberStore(backend.subscribeFn);
    subscribe('k', () => {});
    backend.emit('k', 'first');
    const cb = vi.fn();
    subscribe('k', cb);
    expect(cb).toHaveBeenCalledWith('first');
  });

  it('tears down the underlying listener when the last subscriber leaves', () => {
    const backend = fakeBackend();
    const { subscribe } = createSubscriberStore(backend.subscribeFn);
    const unsub1 = subscribe('k', () => {});
    const unsub2 = subscribe('k', () => {});
    unsub1();
    expect(backend.isActive('k')).toBe(true);
    unsub2();
    expect(backend.isActive('k')).toBe(false);
  });

  it('reopens a fresh listener after all subscribers leave and a new one joins', () => {
    const backend = fakeBackend();
    const { subscribe } = createSubscriberStore(backend.subscribeFn);
    const unsub = subscribe('k', () => {});
    unsub();
    subscribe('k', () => {});
    expect(backend.metrics().listenerCount).toBe(2);
  });

  it('keeps separate cache per key', () => {
    const backend = fakeBackend();
    const { subscribe, peek } = createSubscriberStore(backend.subscribeFn);
    subscribe('alice', () => {});
    subscribe('bob', () => {});
    backend.emit('alice', 'A');
    backend.emit('bob', 'B');
    expect(peek('alice')).toBe('A');
    expect(peek('bob')).toBe('B');
  });

  it('peek returns null for unknown keys', () => {
    const backend = fakeBackend();
    const { peek } = createSubscriberStore(backend.subscribeFn);
    expect(peek('nobody')).toBeNull();
  });

  it('drops the cache when the last subscriber leaves', () => {
    const backend = fakeBackend();
    const { subscribe, peek } = createSubscriberStore(backend.subscribeFn);
    const unsub = subscribe('k', () => {});
    backend.emit('k', 'value');
    expect(peek('k')).toBe('value');
    unsub();
    expect(peek('k')).toBeNull();
  });
});
