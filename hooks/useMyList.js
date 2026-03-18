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
      const rawStatus = options.status || 'plan';
      const isAiring = isAiringAnime(item);
      const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
      const progressInput = Number.isFinite(options.progress) ? options.progress : 0;
      const maxProgress = Number.isFinite(totalEpisodes) ? totalEpisodes : undefined;
      const progress =
        Number.isFinite(maxProgress) && progressInput > maxProgress ? maxProgress : progressInput;
      const existingEntry = list.find((entry) => String(entry.id) === safeId) || null;
      const currentFavorites = list.filter((entry) => entry.isFavorite).length;
      const requestedFavorite =
        typeof options.isFavorite === 'boolean' ? options.isFavorite : undefined;
      const currentFavorite = Boolean(existingEntry?.isFavorite);
      const desiredFavorite =
        typeof requestedFavorite === 'boolean' ? requestedFavorite : currentFavorite;
      const canFavorite = !desiredFavorite || currentFavorite || currentFavorites < 10;
      const isFavorite = desiredFavorite && canFavorite;
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
      const statusLabelMap = {
        plan: 'Planned to watch',
        watching: progress > 0 ? `Watching (${progress}/${totalEpisodes || 'TBA'})` : 'Started watching',
        completed: 'Marked as completed',
        dropped: 'Dropped',
        on_hold: 'On hold',
      };
      const previousStatusRaw = existingEntry?.status || 'plan';
      const previousStatus =
        isAiring && previousStatusRaw === 'completed' ? 'watching' : previousStatusRaw;
      const previousProgress =
        typeof existingEntry?.progress === 'number' ? existingEntry.progress : 0;
      const previousRating =
        typeof existingEntry?.rating === 'number' ? existingEntry.rating : null;
      const previousReview =
        typeof existingEntry?.review === 'string' ? existingEntry.review.trim() : '';
      const nextReview = typeof reviewInput === 'string' ? reviewInput.trim() : previousReview;
      const activityParts = [];

      if (status !== previousStatus) {
        activityParts.push(statusLabelMap[status] || 'Updated status');
      } else if (progress !== previousProgress && status === 'watching') {
        const progressLabel = totalEpisodes
          ? `Watched ${progress}/${totalEpisodes}`
          : `Watched ${progress} eps`;
        activityParts.push(progressLabel);
      }

      if (hasRating && ratingInput !== previousRating) {
        if (typeof ratingInput === 'number') {
          activityParts.push(`Rated ${ratingInput}/5`);
        } else if (previousRating !== null) {
          activityParts.push('Cleared rating');
        }
      }

      if (typeof reviewInput === 'string' && nextReview !== previousReview) {
        if (nextReview && !previousReview) {
          activityParts.push('Wrote a review');
        } else if (nextReview && previousReview) {
          activityParts.push('Updated review');
        } else if (!nextReview && previousReview) {
          activityParts.push('Removed review');
        }
      }

      const activityLabel = activityParts.length
        ? activityParts.join(' • ')
        : statusLabelMap[status] || 'Updated status';
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
