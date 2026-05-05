import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

// Mirrors lib/services/favoriteCharacters.js — see that file for the
// rationale on the two-write pattern (user doc + global counter, not
// transactional on purpose so a counter blip doesn't block the user).
export const setVoiceFavoriteIn = async (db, { uid, voice }) => {
  if (!db || !uid || !voice?.id) return false;
  const voiceId = String(voice.id);
  await setDoc(
    doc(db, 'users', uid, 'favoriteVoices', voiceId),
    {
      id: voiceId,
      name: voice.name || '',
      nameKanji: voice.nameKanji || '',
      imageUrl: voice.imageUrl || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(
    doc(db, 'voiceStats', voiceId),
    { favoritesCount: increment(1) },
    { merge: true },
  );
  return true;
};

export const setVoiceFavorite = (args) =>
  setVoiceFavoriteIn(getFirebaseClient().db, args);

export const unsetVoiceFavoriteIn = async (db, { uid, voiceId }) => {
  if (!db || !uid || !voiceId) return false;
  const id = String(voiceId);
  await deleteDoc(doc(db, 'users', uid, 'favoriteVoices', id));
  await setDoc(
    doc(db, 'voiceStats', id),
    { favoritesCount: increment(-1) },
    { merge: true },
  );
  return true;
};

export const unsetVoiceFavorite = (args) =>
  unsetVoiceFavoriteIn(getFirebaseClient().db, args);

export const listVoiceFavoriteIdsIn = async (db, uid) => {
  if (!db || !uid) return new Set();
  const snap = await getDocs(collection(db, 'users', uid, 'favoriteVoices'));
  const ids = new Set();
  snap.forEach((d) => ids.add(String(d.id)));
  return ids;
};

export const listVoiceFavoriteIds = (uid) =>
  listVoiceFavoriteIdsIn(getFirebaseClient().db, uid);
