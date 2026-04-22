// Integration test for claimUsername — proves uniqueness holds at the
// Firestore layer, not just in client JS. Requires the Firestore emulator
// to be running; `pnpm test` spawns it via `firebase emulators:exec`.

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { claimUsernameIn } from '../lib/services/userProfile';
import { newTestEnv } from './helpers';

let testEnv;

beforeAll(async () => {
  testEnv = await newTestEnv();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const dbFor = (uid) => testEnv.authenticatedContext(uid).firestore();

describe('claimUsername', () => {
  it('first claim succeeds', async () => {
    const result = await claimUsernameIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
    });
    expect(result).toEqual({ ok: true, normalized: 'zenith' });
  });

  it('second user cannot take the same username', async () => {
    const first = await claimUsernameIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
    });
    const second = await claimUsernameIn(dbFor('userB'), {
      uid: 'userB',
      username: 'Zenith',
    });
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: 'taken' });
  });

  it('is idempotent when the same user re-claims their own username', async () => {
    await claimUsernameIn(dbFor('userA'), { uid: 'userA', username: 'Zenith' });
    const again = await claimUsernameIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
    });
    expect(again).toEqual({ ok: true, normalized: 'zenith' });
  });

  it('blocks case-insensitive collisions', async () => {
    await claimUsernameIn(dbFor('userA'), { uid: 'userA', username: 'ZENITH' });
    const lower = await claimUsernameIn(dbFor('userB'), {
      uid: 'userB',
      username: 'zenith',
    });
    const mixed = await claimUsernameIn(dbFor('userB'), {
      uid: 'userB',
      username: 'Zenith',
    });
    expect(lower.ok).toBe(false);
    expect(mixed.ok).toBe(false);
  });

  it('rejects empty / invalid input without hitting Firestore', async () => {
    const db = dbFor('userA');
    expect(await claimUsernameIn(db, { uid: '', username: 'x' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await claimUsernameIn(db, { uid: 'userA', username: '' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await claimUsernameIn(db, { uid: 'userA', username: '   ' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  // Defence in depth: even if a bug in the client logic tried to write a
  // duplicate username with someone else's uid baked in, the Firestore rules
  // must refuse. This guards against a future regression in claimUsername.
  describe('rules-only enforcement', () => {
    it('forbids creating a username doc whose uid does not match the caller', async () => {
      const userB = dbFor('userB');
      await assertFails(
        setDoc(doc(userB, 'usernames', 'impersonated'), {
          uid: 'userA',
          username: 'impersonated',
          normalized: 'impersonated',
        }),
      );
    });

    it('forbids overwriting an existing username doc owned by someone else', async () => {
      await claimUsernameIn(dbFor('userA'), {
        uid: 'userA',
        username: 'zenith',
      });
      const userB = dbFor('userB');
      await assertFails(
        setDoc(doc(userB, 'usernames', 'zenith'), {
          uid: 'userB',
          username: 'zenith',
          normalized: 'zenith',
        }),
      );
    });

    it('forbids deleting a username doc entirely', async () => {
      await claimUsernameIn(dbFor('userA'), {
        uid: 'userA',
        username: 'zenith',
      });
      const userA = dbFor('userA');
      // Even the owner cannot delete — prevents username squatting via
      // release-and-reclaim.
      const { deleteDoc } = await import('firebase/firestore');
      await assertFails(deleteDoc(doc(userA, 'usernames', 'zenith')));
    });
  });
});
