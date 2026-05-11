import { doc, writeBatch } from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

export const setSubcollectionRanksIn = async (db, { uid, collection, orderedIds }) => {
  if (!db || !uid || !collection || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return false;
  }
  const batch = writeBatch(db);
  orderedIds.forEach((id, idx) => {
    if (!id) return;
    batch.set(
      doc(db, 'users', uid, collection, String(id)),
      { personalRank: idx },
      { merge: true },
    );
  });
  await batch.commit();
  return true;
};

export const setSubcollectionRanks = (args) =>
  setSubcollectionRanksIn(getFirebaseClient().db, args);
