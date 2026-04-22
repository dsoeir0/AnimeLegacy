import { useEffect, useState } from 'react';
import useAuth from './useAuth';
import { getFirebaseClient } from '../lib/firebase/client';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ensureAnimeCatalog } from '../lib/services/animeCatalog';
import { addUserActivity, upsertUserAnime, updateUserAnime } from '../lib/services/userAnime';
import { isAiringAnime } from '../lib/utils/anime';
import {
  clampProgress,
  deriveActivityLabel,
  resolveFavorite,
  resolveStatus,
} from '../lib/utils/listTransitions';

export default function useMyList() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const canEdit = Boolean(user?.uid);

  useEffect(() => {
    let unsubscribe = null;

    const loadRemote = async () => {
      const { db } = getFirebaseClient();
      if (!db || !user?.uid) {
        setList([]);
        setHasLoaded(true);
        return;
      }
      const listRef = collection(db, 'users', user.uid, 'list');
      const listQuery = query(listRef, orderBy('addedAt', 'desc'));
      unsubscribe = onSnapshot(listQuery, (snapshot) => {
        const items = snapshot.docs.map((docItem) => docItem.data());
        setList(items);
        setHasLoaded(true);
      });
    };

    loadRemote();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  const addItem = async (item, options = {}) => {
    if (!item?.id || !user?.uid) return false;
    const safeId = String(item.id);
    const { db } = getFirebaseClient();
    if (db) {
      const totalEpisodes = Number.isFinite(item?.episodes) ? item.episodes : item?.episodesTotal;
      const isAiring = isAiringAnime(item);
      const status = resolveStatus(options.status, isAiring);
      const progress = clampProgress(options.progress, totalEpisodes);
      const existingEntry = list.find((entry) => String(entry.id) === safeId) || null;
      const currentFavorites = list.filter((entry) => entry.isFavorite).length;
      const requestedFavorite =
        typeof options.isFavorite === 'boolean' ? options.isFavorite : undefined;
      const currentFavorite = Boolean(existingEntry?.isFavorite);
      const desiredFavorite =
        typeof requestedFavorite === 'boolean' ? requestedFavorite : currentFavorite;
      const isFavorite = resolveFavorite({
        desired: desiredFavorite,
        current: currentFavorite,
        currentCount: currentFavorites,
      });
      const hasRating =
        typeof options.rating === 'number' || options.rating === null;
      const ratingInput =
        typeof options.rating === 'number' ? options.rating : null;
      const reviewInput = typeof options.review === 'string' ? options.review : undefined;
      const addedAtValue = options.keepAddedAt ? undefined : serverTimestamp();
      const payload = {
        ...item,
        id: safeId,
        ...(addedAtValue ? { addedAt: addedAtValue } : {}),
        status,
        progress,
        episodesTotal: Number.isFinite(totalEpisodes) ? totalEpisodes : null,
        isFavorite,
        ...(hasRating ? { rating: ratingInput } : {}),
        ...(typeof reviewInput === 'string' ? { review: reviewInput } : {}),
      };
      await setDoc(doc(db, 'users', user.uid, 'list', safeId), payload, { merge: true });
      await ensureAnimeCatalog(item);
      await upsertUserAnime({
        uid: user.uid,
        anime: item,
        overrides: {
          status,
          progress,
          episodesTotal: Number.isFinite(totalEpisodes) ? totalEpisodes : null,
          isFavorite,
          ...(hasRating ? { rating: ratingInput } : {}),
          ...(typeof reviewInput === 'string' ? { review: reviewInput } : {}),
          ...(addedAtValue ? { addedAt: addedAtValue } : {}),
        },
      });
      const previousStatus = resolveStatus(existingEntry?.status, isAiring);
      const activityLabel = deriveActivityLabel({
        prev: {
          status: previousStatus,
          progress: existingEntry?.progress,
          rating: existingEntry?.rating,
          review: existingEntry?.review,
        },
        next: {
          status,
          progress,
          hasRating,
          rating: ratingInput,
          review: reviewInput,
        },
        totalEpisodes,
      });
      await addUserActivity({
        uid: user.uid,
        activity: {
          animeId: safeId,
          title: item.title || item.title_english || 'Untitled',
          posterUrl: item.image || item.posterUrl || '',
          type: 'status',
          label: activityLabel,
        },
      });
      return true;
    }
    return false;
  };

  const removeItem = async (id) => {
    if (!user?.uid) return false;
    const safeId = String(id);
    const { db } = getFirebaseClient();
    if (db) {
      await deleteDoc(doc(db, 'users', user.uid, 'list', safeId));
      await updateUserAnime({
        uid: user.uid,
        animeId: safeId,
        patch: { status: 'removed', removedAt: serverTimestamp() },
      });
      return true;
    }
    return false;
  };

  const isInList = (id) => list.some((entry) => String(entry.id) === String(id));
  const getEntry = (id) => list.find((entry) => String(entry.id) === String(id)) || null;
  const favoritesCount = list.filter((entry) => entry.isFavorite).length;

  return { list, addItem, removeItem, isInList, getEntry, hasLoaded, canEdit, favoritesCount };
}
