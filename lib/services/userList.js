import {
  collection,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

// Backfill `addedAt` on list docs that lost it during an earlier import.
// Without this field, `useMyList`'s `orderBy('addedAt', 'desc')` query
// hides the doc entirely (Firestore excludes docs missing the orderBy
// field). Returns the number of docs healed. Safe to run repeatedly —
// only writes to docs that are actually missing the field.
//
// Background: the MAL import shipped with `keepAddedAt: true` which made
// brand-new list docs skip the field entirely, leaving them invisible in
// `/my-list` even though the data was written. The import loop was fixed
// to drop that flag; this heal exists to recover users who imported
// before the fix landed. See 2026-04-23.
//
// Writes are batched 8-wide — serial was too slow for 600+ docs (120s+),
// and Firestore SDK already coalesces parallel writes. The caller sees
// the heal progress live via the useMyList onSnapshot subscription.
const HEAL_CONCURRENCY = 8;

export const healMissingAddedAtIn = async (db, uid) => {
  if (!db || !uid) return 0;
  const snap = await getDocs(collection(db, 'users', uid, 'list'));
  const targets = snap.docs.filter((d) => !d.data().addedAt);
  if (targets.length === 0) return 0;
  let healed = 0;
  for (let i = 0; i < targets.length; i += HEAL_CONCURRENCY) {
    const slice = targets.slice(i, i + HEAL_CONCURRENCY);
    await Promise.all(
      slice.map(async (d) => {
        try {
          await setDoc(d.ref, { addedAt: serverTimestamp() }, { merge: true });
          healed += 1;
        } catch {
          // swallow per-doc failures; next heal run can retry
        }
      }),
    );
  }
  return healed;
};

export const healMissingAddedAt = (uid) =>
  healMissingAddedAtIn(getFirebaseClient().db, uid);
