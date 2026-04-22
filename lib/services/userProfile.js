import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

export const getUserProfile = async (uid) => {
  const { db } = getFirebaseClient();
  if (!db || !uid) return null;
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
};

// Exported separately so tests can inject an emulator-backed Firestore
// instance without going through getFirebaseClient().
export const claimUsernameIn = async (db, { uid, username }) => {
  if (!db || !uid || !username) return { ok: false, reason: 'invalid' };
  const normalized = String(username).trim().toLowerCase();
  if (!normalized) return { ok: false, reason: 'invalid' };

  const usernameRef = doc(db, 'usernames', normalized);
  try {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(usernameRef);
      if (snapshot.exists()) {
        if (snapshot.data()?.uid !== uid) {
          throw new Error('username-taken');
        }
        return;
      }
      transaction.set(usernameRef, {
        uid,
        username,
        normalized,
        createdAt: serverTimestamp(),
      });
    });
    return { ok: true, normalized };
  } catch (err) {
    if (err?.message === 'username-taken') return { ok: false, reason: 'taken' };
    return { ok: false, reason: 'unknown' };
  }
};

export const claimUsername = (args) => claimUsernameIn(getFirebaseClient().db, args);

// Exported separately so tests can inject an emulator-backed Firestore.
export const upsertUserProfileIn = async (
  db,
  { uid, username, bio, avatarUrl, avatarData, email, displayName },
) => {
  if (!db || !uid) return false;

  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const createdAt = existing.exists() ? existing.data()?.createdAt : serverTimestamp();
  const existingData = existing.exists() ? existing.data() : {};
  const usernameLower = username
    ? String(username).trim().toLowerCase()
    : existingData?.usernameLower || '';

  await setDoc(
    userRef,
    {
      uid,
      username: username || displayName || email || 'User',
      usernameLower,
      displayName: displayName || username || email || 'User',
      avatarUrl: avatarUrl ?? existingData?.avatarUrl ?? '',
      avatarData: avatarData ?? existingData?.avatarData ?? '',
      bio: bio || '',
      email: email || '',
      createdAt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
};

export const upsertUserProfile = (args) =>
  upsertUserProfileIn(getFirebaseClient().db, args);
