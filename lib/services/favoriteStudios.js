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
export const setStudioFavoriteIn = async (db, { uid, studio }) => {
  if (!db || !uid || !studio?.id) return false;
  const studioId = String(studio.id);
  await setDoc(
    doc(db, 'users', uid, 'favoriteStudios', studioId),
    {
      id: studioId,
      name: studio.name || '',
      established: studio.established || '',
      imageUrl: studio.imageUrl || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(
    doc(db, 'studioStats', studioId),
    { favoritesCount: increment(1) },
    { merge: true },
  );
  return true;
};

export const setStudioFavorite = (args) =>
  setStudioFavoriteIn(getFirebaseClient().db, args);

export const unsetStudioFavoriteIn = async (db, { uid, studioId }) => {
  if (!db || !uid || !studioId) return false;
  const id = String(studioId);
  await deleteDoc(doc(db, 'users', uid, 'favoriteStudios', id));
  await setDoc(
    doc(db, 'studioStats', id),
    { favoritesCount: increment(-1) },
    { merge: true },
  );
  return true;
};

export const unsetStudioFavorite = (args) =>
  unsetStudioFavoriteIn(getFirebaseClient().db, args);

export const listStudioFavoriteIdsIn = async (db, uid) => {
  if (!db || !uid) return new Set();
  const snap = await getDocs(collection(db, 'users', uid, 'favoriteStudios'));
  const ids = new Set();
  snap.forEach((d) => ids.add(String(d.id)));
  return ids;
};

export const listStudioFavoriteIds = (uid) =>
  listStudioFavoriteIdsIn(getFirebaseClient().db, uid);
