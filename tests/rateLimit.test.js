import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, getClientIp, guardApiRoute } from '../lib/utils/rateLimit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to max within window, blocks after', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limiter('a').allowed).toBe(true);
    expect(limiter('a').allowed).toBe(true);
    expect(limiter('a').allowed).toBe(true);
    const blocked = limiter('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    expect(limiter('a').allowed).toBe(true);
    expect(limiter('a').allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(limiter('a').allowed).toBe(true);
  });

  it('isolates buckets by key', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    expect(limiter('a').allowed).toBe(true);
    expect(limiter('b').allowed).toBe(true);
    expect(limiter('a').allowed).toBe(false);
    expect(limiter('b').allowed).toBe(false);
  });

});

describe('getClientIp', () => {
  it('extracts the first IP from x-forwarded-for', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })).toBe('1.2.3.4');
  });

  it('falls back to socket.remoteAddress', () => {
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '9.9.9.9' } })).toBe('9.9.9.9');
  });

  it('returns "unknown" when nothing is available', () => {
    expect(getClientIp({ headers: {} })).toBe('unknown');
  });
});

describe('guardApiRoute', () => {
  const mockRes = () => {
    const res = { headers: {}, statusCode: null, body: null };
    res.setHeader = (k, v) => {
      res.headers[k] = v;
    };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.body = body;
      return res;
    };
    return res;
  };

  it('returns true and does not touch res when allowed', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    const res = mockRes();
    expect(guardApiRoute({ headers: {} }, res, limiter)).toBe(true);
    expect(res.statusCode).toBe(null);
  });

  it('returns false, sets 429 + Retry-After when blocked', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    const req = { headers: { 'x-forwarded-for': '1.1.1.1' } };
    const res = mockRes();
    guardApiRoute(req, res, limiter);
    const blocked = mockRes();
    expect(guardApiRoute(req, blocked, limiter)).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many requests' });
    expect(blocked.headers['Retry-After']).toBeGreaterThan(0);
  });
});
