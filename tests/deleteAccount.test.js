// Tests for /api/delete-account focus on the **gatekeeping** paths — the
// paths that most frequently go wrong when someone wires up this route in a
// new environment:
//   - wrong HTTP method
//   - Admin SDK not configured (the graceful-degrade path the whole design
//     revolves around)
//   - missing / invalid bearer token
//
// The happy-path cascade (deleting users/{uid} + subcollections + username
// reservation + the Auth user) is deliberately NOT shimmed here. The
// handler calls `firebase-admin`'s specific surface (`.collection().doc()`
// chain-style) which differs from the v9 modular SDK the emulator exposes
// via @firebase/rules-unit-testing. Shimming between them is brittle and
// doesn't catch real Admin-SDK regressions. Instead:
//   - This file tests the logic that decides *whether* the cascade runs
//   - docs/account-deletion.md documents a manual smoke test after you
//     first set FIREBASE_ADMIN_* in Vercel
//
// If we ever need to unit-test the cascade itself, extract it into a pure
// function that takes a minimal `{ getUser, deleteDoc, listDocs, deleteAuthUser }`
// adapter, then test the adapter with either SDK.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/delete-account';
import * as admin from '../lib/firebase/admin';

beforeEach(() => {
  vi.restoreAllMocks();
});

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
};

describe('POST /api/delete-account', () => {
  it('returns 405 for non-POST requests', async () => {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });

  it('returns 503 with fallback hint when Admin SDK is not configured', async () => {
    vi.spyOn(admin, 'getAdminAuth').mockReturnValue(null);
    vi.spyOn(admin, 'getAdminDb').mockReturnValue(null);

    const res = mockRes();
    await handler({ method: 'POST', headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error: 'admin-not-configured',
      fallback: '/privacy',
    });
  });

  it('returns 401 when Admin SDK is configured but no bearer token is provided', async () => {
    vi.spyOn(admin, 'getAdminAuth').mockReturnValue({
      verifyIdToken: vi.fn(),
      deleteUser: vi.fn(),
    });
    vi.spyOn(admin, 'getAdminDb').mockReturnValue({});

    const res = mockRes();
    await handler({ method: 'POST', headers: {} }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Missing bearer token');
  });

  it('returns 401 when the token is invalid', async () => {
    vi.spyOn(admin, 'getAdminAuth').mockReturnValue({
      verifyIdToken: vi.fn().mockRejectedValue(new Error('bad token')),
      deleteUser: vi.fn(),
    });
    vi.spyOn(admin, 'getAdminDb').mockReturnValue({});

    const res = mockRes();
    await handler(
      { method: 'POST', headers: { authorization: 'Bearer not-a-real-token' } },
      res,
    );
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });
});
