// Integration tests for upsertUserProfile — proves:
//   • new users get createdAt stamped, usernameLower derived, defaults filled
//   • subsequent updates preserve createdAt and refresh updatedAt
//   • merge semantics don't clobber avatarData/avatarUrl when omitted
//   • Firestore rules block writing to someone else's user doc

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { upsertUserProfileIn } from '../lib/services/userProfile';
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
const readUser = async (uid) => {
  // Read under the same uid so rules allow it.
  const snap = await getDoc(doc(dbFor(uid), 'users', uid));
  return snap.exists() ? snap.data() : null;
};

describe('upsertUserProfile', () => {
  it('creates a new user doc with the expected shape', async () => {
    const ok = await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      bio: 'I track slow anime.',
      email: 'zenith@example.com',
      displayName: 'Zenith',
    });
    expect(ok).toBe(true);

    const stored = await readUser('userA');
    expect(stored).toMatchObject({
      uid: 'userA',
      username: 'Zenith',
      usernameLower: 'zenith',
      bio: 'I track slow anime.',
      email: 'zenith@example.com',
      displayName: 'Zenith',
      avatarUrl: '',
      avatarData: '',
    });
    expect(stored.createdAt).toBeTruthy();
    expect(stored.updatedAt).toBeTruthy();
  });

  it('preserves createdAt on subsequent updates', async () => {
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      email: 'zenith@example.com',
    });
    const first = await readUser('userA');

    // Simulate a later edit.
    await new Promise((r) => setTimeout(r, 10));
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      bio: 'Updated bio.',
      email: 'zenith@example.com',
    });
    const second = await readUser('userA');

    expect(second.createdAt).toEqual(first.createdAt);
    expect(second.updatedAt).not.toEqual(first.updatedAt);
    expect(second.bio).toBe('Updated bio.');
  });

  it('keeps existing usernameLower when username is not provided', async () => {
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      email: 'zenith@example.com',
    });
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      bio: 'Only bio changed.',
      email: 'zenith@example.com',
    });
    const stored = await readUser('userA');
    expect(stored.usernameLower).toBe('zenith');
    expect(stored.bio).toBe('Only bio changed.');
  });

  it('preserves existing avatarData when not passed in', async () => {
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      avatarData: 'data:image/png;base64,AAA',
      email: 'z@x.com',
    });
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      bio: 'Bio only.',
      email: 'z@x.com',
    });
    const stored = await readUser('userA');
    expect(stored.avatarData).toBe('data:image/png;base64,AAA');
  });

  it('clears avatarData when an empty string is passed explicitly', async () => {
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      avatarData: 'data:image/png;base64,AAA',
      email: 'z@x.com',
    });
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      username: 'Zenith',
      avatarData: '',
      email: 'z@x.com',
    });
    const stored = await readUser('userA');
    expect(stored.avatarData).toBe('');
  });

  it('falls back to email / displayName / "User" when no username is ever set', async () => {
    await upsertUserProfileIn(dbFor('userA'), {
      uid: 'userA',
      email: 'zenith@example.com',
    });
    const stored = await readUser('userA');
    expect(stored.username).toBe('zenith@example.com');
    expect(stored.displayName).toBe('zenith@example.com');
  });

  it('returns false for invalid input without writing', async () => {
    const result = await upsertUserProfileIn(dbFor('userA'), {
      uid: '',
      username: 'Zenith',
    });
    expect(result).toBe(false);
  });

  it('rules block writing to another user doc even with a valid payload', async () => {
    const userB = dbFor('userB');
    // Even though upsertUserProfileIn's client logic would happily run, the
    // Firestore rules must reject the write when the caller's uid doesn't
    // match the document path.
    await assertFails(
      upsertUserProfileIn(userB, {
        uid: 'userA',
        username: 'impersonated',
        email: 'x@x.com',
      }),
    );
  });
});
