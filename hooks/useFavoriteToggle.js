import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';
import { FAVORITE_LIMIT } from '../lib/constants';

// Generic favourite-toggle hook used by /characters/[id], /voices/[id],
// and /studios/[id]. Keeps the state machine (isFavorite, count, total,
// error, loaded) and the toggle handler in one place so the per-bucket
// pages stay declarative — they only configure the bucket name, the
// service functions, and the payload shape.
//
// `statsCollectionName` is optional. When provided, the hook also
// subscribes to the global counter doc and exposes `favoriteTotal`
// for pages that want to display it (currently only /characters).
//
// Returns an object suitable to spread or destructure:
//   { isFavorite, favoriteCount, favoriteTotal, favoriteError,
//     favoriteLoaded, toggleFavorite }
//
// The hook deliberately avoids transactional consistency between the
// optimistic UI update and the underlying Firestore writes — see the
// service files (`favoriteCharacters.js` etc.) for why partial failure
// is acceptable.
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
