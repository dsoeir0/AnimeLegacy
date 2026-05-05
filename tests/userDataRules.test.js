// Rules-only tests for the user-scoped subcollections. Every user-private
// document in Firestore lives under /users/{uid}/... and must be reachable
// only by the owner. This test exists so any future loosening of the rules
// surfaces immediately, not as a GDPR issue three months later.

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

const authed = (uid) => testEnv.authenticatedContext(uid).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

const seedAnimeEntry = async (uid) => {
  await setDoc(doc(authed(uid), 'users', uid, 'anime', '1'), {
    animeId: '1',
    title: 'Seeded',
    status: 'watching',
    progress: 3,
  });
};

describe('users/{uid}/anime rules', () => {
  it('owner can write and read their own anime entries', async () => {
    const ownerDb = authed('userA');
    await assertSucceeds(
      setDoc(doc(ownerDb, 'users', 'userA', 'anime', '1'), {
        animeId: '1',
        title: 'Cartographer',
        status: 'watching',
        progress: 5,
      }),
    );
    await assertSucceeds(getDoc(doc(ownerDb, 'users', 'userA', 'anime', '1')));
  });

  it('another signed-in user cannot read someone else\'s anime entry', async () => {
    await seedAnimeEntry('userA');
    await assertFails(
      getDoc(doc(authed('userB'), 'users', 'userA', 'anime', '1')),
    );
  });

  it('another signed-in user cannot write to someone else\'s anime entry', async () => {
    await assertFails(
      setDoc(doc(authed('userB'), 'users', 'userA', 'anime', '1'), {
        animeId: '1',
        title: 'Impersonated',
        status: 'watching',
        progress: 0,
      }),
    );
  });

  it('anonymous users cannot read or write any anime entry', async () => {
    await seedAnimeEntry('userA');
    await assertFails(getDoc(doc(anon(), 'users', 'userA', 'anime', '1')));
    await assertFails(
      setDoc(doc(anon(), 'users', 'userA', 'anime', '1'), {
        animeId: '1',
        status: 'watching',
        progress: 0,
      }),
    );
  });
});

describe('users/{uid}/list rules', () => {
  it('owner can write and read their own list entries', async () => {
    const ownerDb = authed('userA');
    await assertSucceeds(
      setDoc(doc(ownerDb, 'users', 'userA', 'list', '1'), {
        animeId: '1',
        title: 'Cartographer',
        addedAt: new Date(),
      }),
    );
    await assertSucceeds(getDoc(doc(ownerDb, 'users', 'userA', 'list', '1')));
  });

  it('other users cannot read or write list entries', async () => {
    await setDoc(doc(authed('userA'), 'users', 'userA', 'list', '1'), {
      animeId: '1',
      title: 'Seeded',
    });
    const stranger = authed('userB');
    await assertFails(getDoc(doc(stranger, 'users', 'userA', 'list', '1')));
    await assertFails(
      setDoc(doc(stranger, 'users', 'userA', 'list', '1'), {
        animeId: '1',
        title: 'Impersonated',
      }),
    );
  });
});

describe('users/{uid}/activity rules', () => {
  it('owner can write activity entries', async () => {
    await assertSucceeds(
      setDoc(doc(authed('userA'), 'users', 'userA', 'activity', 'evt-1'), {
        animeId: '1',
        type: 'status',
        label: 'Ep 5/12 • Watching',
        createdAt: new Date(),
      }),
    );
  });

  it('other users cannot read or write activity entries', async () => {
    await setDoc(doc(authed('userA'), 'users', 'userA', 'activity', 'evt-1'), {
      animeId: '1',
      type: 'status',
      label: 'Ep 5/12 • Watching',
    });
    const stranger = authed('userB');
    await assertFails(
      getDoc(doc(stranger, 'users', 'userA', 'activity', 'evt-1')),
    );
    await assertFails(
      setDoc(doc(stranger, 'users', 'userA', 'activity', 'evt-2'), {
        animeId: '1',
        type: 'status',
        label: 'Forged entry',
      }),
    );
  });
});

// Three favourite subcollections share the same isolation rules: only the
// owner can read or write, no cross-user access. Parameterised so that new
// favourite types (voices, studios, etc.) only require adding the slug here.
for (const col of ['favoriteCharacters', 'favoriteVoices', 'favoriteStudios']) {
  describe(`users/{uid}/${col} rules`, () => {
    it(`owner can write ${col}`, async () => {
      await assertSucceeds(
        setDoc(doc(authed('userA'), 'users', 'userA', col, '42'), {
          id: 42,
          name: 'Test entry',
          updatedAt: new Date(),
        }),
      );
    });

    it(`other users cannot read or write ${col}`, async () => {
      await setDoc(doc(authed('userA'), 'users', 'userA', col, '42'), {
        id: 42,
        name: 'Seeded',
      });
      const stranger = authed('userB');
      await assertFails(getDoc(doc(stranger, 'users', 'userA', col, '42')));
      await assertFails(
        setDoc(doc(stranger, 'users', 'userA', col, '42'), {
          id: 42,
          name: 'Impersonated',
        }),
      );
    });
  });
}

describe('anime/{id} catalog rules', () => {
  it('anyone can read catalog docs (public by design)', async () => {
    await setDoc(doc(authed('userA'), 'anime', '1'), {
      animeId: '1',
      title: 'Cartographer',
    });
    await assertSucceeds(getDoc(doc(anon(), 'anime', '1')));
  });

  it('signed-in users can write to the catalog (used by ensureAnimeCatalog and translation cache)', async () => {
    await assertSucceeds(
      setDoc(doc(authed('userA'), 'anime', '1'), {
        animeId: '1',
        title: 'Cartographer',
      }),
    );
  });

  it('anonymous users cannot write to the catalog', async () => {
    await assertFails(
      setDoc(doc(anon(), 'anime', '1'), {
        animeId: '1',
        title: 'Malicious',
      }),
    );
  });
});

describe('characters/{id} + people/{id} + studios/{id} translation caches', () => {
  for (const col of ['characters', 'people', 'studios']) {
    it(`anyone can read ${col}/{id}`, async () => {
      await setDoc(doc(authed('userA'), col, '42'), {
        biographyByLang: { pt: 'Biografia traduzida.' },
      });
      await assertSucceeds(getDoc(doc(anon(), col, '42')));
    });

    it(`signed-in users can write to ${col}/{id}`, async () => {
      await assertSucceeds(
        setDoc(doc(authed('userA'), col, '42'), {
          biographyByLang: { pt: 'Biografia traduzida.' },
        }),
      );
    });

    it(`anonymous users cannot write to ${col}/{id}`, async () => {
      await assertFails(
        setDoc(doc(anon(), col, '42'), {
          biographyByLang: { pt: 'Spam.' },
        }),
      );
    });
  }
});

// All three *Stats collections share the same shape constraint: writers
// must be authenticated and the body must contain only `favoritesCount`,
// a non-negative int. Parameterised to avoid drift if any rule is touched.
for (const col of ['characterStats', 'voiceStats', 'studioStats']) {
  describe(`${col}/{id} rules`, () => {
    it(`allows an authenticated user to set only favoritesCount on ${col}`, async () => {
      await assertSucceeds(
        setDoc(doc(authed('userA'), col, '42'), {
          favoritesCount: 5,
        }),
      );
    });

    it(`rejects any additional fields beyond favoritesCount on ${col}`, async () => {
      await assertFails(
        setDoc(doc(authed('userA'), col, '42'), {
          favoritesCount: 5,
          maliciousField: 'nope',
        }),
      );
    });

    it(`rejects a negative favoritesCount on ${col}`, async () => {
      await assertFails(
        setDoc(doc(authed('userA'), col, '42'), {
          favoritesCount: -1,
        }),
      );
    });

    it(`rejects a non-integer favoritesCount on ${col}`, async () => {
      await assertFails(
        setDoc(doc(authed('userA'), col, '42'), {
          favoritesCount: 'five',
        }),
      );
    });
  });
}
