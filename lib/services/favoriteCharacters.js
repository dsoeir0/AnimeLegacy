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

// Writes a character favourite. Two side-effects kept in lock-step:
//   - users/{uid}/favoriteCharacters/{characterId} — the per-user entry
//   - characterStats/{characterId}.favoritesCount — the global counter
//
// The two writes are NOT in a transaction on purpose: the counter is a
// soft aggregate and a partial failure (one write succeeds, the other
// doesn't) is better than blocking the user from favouriting at all.
// The character page and the MAL import both call this helper so the
// behaviour stays identical everywhere.
//
// The `*In` variant takes `db` as a parameter so integration tests can
// pass the emulator handle. Matches the convention set in
// lib/services/userProfile.js.
export const setCharacterFavoriteIn = async (db, { uid, character }) => {
  if (!db || !uid || !character?.id) return false;
  const characterId = String(character.id);
  await setDoc(
    doc(db, 'users', uid, 'favoriteCharacters', characterId),
    {
      id: characterId,
      name: character.name || '',
      nameKanji: character.nameKanji || '',
      imageUrl: character.imageUrl || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(
    doc(db, 'characterStats', characterId),
    { favoritesCount: increment(1) },
    { merge: true },
  );
  return true;
};

export const setCharacterFavorite = (args) =>
  setCharacterFavoriteIn(getFirebaseClient().db, args);

export const unsetCharacterFavoriteIn = async (db, { uid, characterId }) => {
  if (!db || !uid || !characterId) return false;
  const id = String(characterId);
  await deleteDoc(doc(db, 'users', uid, 'favoriteCharacters', id));
  await setDoc(
    doc(db, 'characterStats', id),
    { favoritesCount: increment(-1) },
    { merge: true },
  );
  return true;
};

export const unsetCharacterFavorite = (args) =>
  unsetCharacterFavoriteIn(getFirebaseClient().db, args);

// Snapshot of the user's current character favourites — returns a Set of
// document IDs (as strings). Used by the MAL importer to de-duplicate
// before writing.
export const listCharacterFavoriteIdsIn = async (db, uid) => {
  if (!db || !uid) return new Set();
  const snap = await getDocs(collection(db, 'users', uid, 'favoriteCharacters'));
  const ids = new Set();
  snap.forEach((d) => ids.add(String(d.id)));
  return ids;
};

export const listCharacterFavoriteIds = (uid) =>
  listCharacterFavoriteIdsIn(getFirebaseClient().db, uid);
