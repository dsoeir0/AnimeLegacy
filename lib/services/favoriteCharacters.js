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
import { setSubcollectionRanks } from './favoriteOrder';

export const setCharacterFavoritesOrder = ({ uid, orderedIds }) =>
  setSubcollectionRanks({ uid, collection: 'favoriteCharacters', orderedIds });

// Counter write isn't transactional with the user-doc write — partial failure beats blocking.
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

export const listCharacterFavoriteIdsIn = async (db, uid) => {
  if (!db || !uid) return new Set();
  const snap = await getDocs(collection(db, 'users', uid, 'favoriteCharacters'));
  const ids = new Set();
  snap.forEach((d) => ids.add(String(d.id)));
  return ids;
};

export const listCharacterFavoriteIds = (uid) =>
  listCharacterFavoriteIdsIn(getFirebaseClient().db, uid);
