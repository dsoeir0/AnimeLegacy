import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  dismissNotificationsIn,
  markAllReadIn,
  setSeenEpisodesIn,
} from '../lib/firebase/notificationStateStore';
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
const seed = async (uid, payload) => {
  await setDoc(
    doc(dbFor(uid), 'users', uid, 'notificationState', 'current'),
    payload,
  );
};
const read = async (uid) => {
  const snap = await getDoc(
    doc(dbFor(uid), 'users', uid, 'notificationState', 'current'),
  );
  return snap.exists() ? snap.data() : null;
};

describe('markAllReadIn', () => {
  it('writes a lastReadAt timestamp under the owner doc', async () => {
    await markAllReadIn(dbFor('userA'), 'userA');
    const stored = await read('userA');
    expect(stored.lastReadAt).toBeTruthy();
  });

  it('preserves dismissedIds and seenEpisodes when marking as read', async () => {
    await seed('userA', {
      dismissedIds: ['airingToday:101:2026-05-04'],
      seenEpisodes: { 101: 12 },
    });
    await markAllReadIn(dbFor('userA'), 'userA');
    const stored = await read('userA');
    expect(stored.dismissedIds).toEqual(['airingToday:101:2026-05-04']);
    expect(stored.seenEpisodes).toEqual({ 101: 12 });
    expect(stored.lastReadAt).toBeTruthy();
  });
});

describe('dismissNotificationsIn', () => {
  it('appends new ids without dropping the existing ones', async () => {
    await seed('userA', { dismissedIds: ['existing:1'] });
    await dismissNotificationsIn(dbFor('userA'), 'userA', ['new:1', 'new:2']);
    const stored = await read('userA');
    expect(stored.dismissedIds.sort()).toEqual(
      ['existing:1', 'new:1', 'new:2'].sort(),
    );
  });

  it('deduplicates ids that are already dismissed (arrayUnion semantics)', async () => {
    await seed('userA', { dismissedIds: ['shared:1'] });
    await dismissNotificationsIn(dbFor('userA'), 'userA', ['shared:1', 'new:1']);
    const stored = await read('userA');
    expect(stored.dismissedIds.sort()).toEqual(['new:1', 'shared:1']);
  });

  it('is a no-op for empty input', async () => {
    await seed('userA', { dismissedIds: ['untouched:1'] });
    await dismissNotificationsIn(dbFor('userA'), 'userA', []);
    const stored = await read('userA');
    expect(stored.dismissedIds).toEqual(['untouched:1']);
  });
});

describe('setSeenEpisodesIn', () => {
  it('merges new entries without overwriting other anime entries', async () => {
    await seed('userA', { seenEpisodes: { 101: 12, 202: 5 } });
    await setSeenEpisodesIn(
      dbFor('userA'),
      'userA',
      { 303: 8 },
      { 101: 12, 202: 5 },
    );
    const stored = await read('userA');
    expect(stored.seenEpisodes).toEqual({ 101: 12, 202: 5, 303: 8 });
  });

  it('updates the count for an anime already tracked', async () => {
    await seed('userA', { seenEpisodes: { 101: 5 } });
    await setSeenEpisodesIn(dbFor('userA'), 'userA', { 101: 12 }, { 101: 5 });
    const stored = await read('userA');
    expect(stored.seenEpisodes).toEqual({ 101: 12 });
  });

  it('skips the write when the patch matches current state', async () => {
    await seed('userA', { seenEpisodes: { 101: 12 }, lastReadAt: 1_000 });
    await setSeenEpisodesIn(dbFor('userA'), 'userA', { 101: 12 }, { 101: 12 });
    const stored = await read('userA');
    expect(stored.lastReadAt).toBe(1_000);
  });
});
