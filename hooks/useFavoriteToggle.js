import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';
import { FAVORITE_LIMIT } from '../lib/constants';

export default function useFavoriteToggle({
  uid,
  entityId,
  collectionName,
  statsCollectionName,
  setFavoriteFn,
  unsetFavoriteFn,
  buildSetPayload,
  buildUnsetPayload,
  errorKeys,
  t,
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteTotal, setFavoriteTotal] = useState(0);
  const [favoriteError, setFavoriteError] = useState('');
  const [favoriteLoaded, setFavoriteLoaded] = useState(false);

  useEffect(() => {
    if (!entityId || !uid) return undefined;
    const { db } = getFirebaseClient();
    if (!db) return undefined;
    const favoritesRef = collection(db, 'users', uid, collectionName);
    const unsubscribe = onSnapshot(favoritesRef, (snapshot) => {
      const ids = snapshot.docs.map((d) => String(d.id));
      setFavoriteCount(ids.length);
      setIsFavorite(ids.includes(String(entityId)));
      setFavoriteLoaded(true);
    });
    return () => unsubscribe();
  }, [entityId, uid, collectionName]);

  useEffect(() => {
    if (!entityId || !statsCollectionName) {
      setFavoriteTotal(0);
      return undefined;
    }
    const { db } = getFirebaseClient();
    if (!db) {
      setFavoriteTotal(0);
      return undefined;
    }
    const ref = doc(db, statsCollectionName, String(entityId));
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setFavoriteTotal(snap.data()?.favoritesCount || 0);
        else setFavoriteTotal(0);
      },
      () => setFavoriteTotal(0),
    );
    return () => unsubscribe();
  }, [entityId, statsCollectionName]);

  const toggleFavorite = async () => {
    if (!entityId || typeof window === 'undefined') return;
    if (!uid) {
      setFavoriteError(t(errorKeys.signIn));
      return;
    }
    if (!favoriteLoaded) {
      setFavoriteError(t(errorKeys.loading));
      return;
    }
    const next = !isFavorite;
    if (next && favoriteCount >= FAVORITE_LIMIT) {
      setFavoriteError(t(errorKeys.limit, { limit: FAVORITE_LIMIT }));
      return;
    }
    setFavoriteError('');
    setIsFavorite(next);
    setFavoriteTotal((c) => Math.max(0, (c || 0) + (next ? 1 : -1)));
    try {
      if (next) {
        await setFavoriteFn(buildSetPayload());
      } else {
        await unsetFavoriteFn(buildUnsetPayload());
      }
    } catch {
      setFavoriteError(t(errorKeys.generic));
    }
  };

  return {
    isFavorite,
    favoriteCount,
    favoriteTotal,
    favoriteError,
    favoriteLoaded,
    toggleFavorite,
  };
}
