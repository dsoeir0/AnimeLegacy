import {
  collection,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

// Firestore orderBy('addedAt') hides docs missing the field; this backfills it for
// users imported before the fix.
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
        } catch {}
      }),
    );
  }
  return healed;
};

export const healMissingAddedAt = (uid) =>
  healMissingAddedAtIn(getFirebaseClient().db, uid);
