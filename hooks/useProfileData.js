import { useEffect, useMemo, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';

const EPISODE_MINUTES = 24;

const computeStats = (items) => {
  const watchedCount = items.filter((item) => item.status === 'completed').length;
  const totalEpisodes = items.reduce((sum, item) => {
    if (typeof item.progress === 'number') return sum + item.progress;
    if (item.status === 'completed' && typeof item.episodesTotal === 'number') {
      return sum + item.episodesTotal;
    }
    return sum;
  }, 0);
  const daysSpent = (totalEpisodes * EPISODE_MINUTES) / 60 / 24;
  const scored = items.filter((item) => typeof item.rating === 'number');
  const meanScore = scored.length
    ? scored.reduce((sum, item) => sum + item.rating, 0) / scored.length
    : null;

  return {
    watchedCount,
    totalEpisodes,
    daysSpent,
    meanScore,
  };
};

const computeGenres = (items) => {
  const tally = new Map();
  items.forEach((item) => {
    if (!Array.isArray(item.genres)) return;
    item.genres.forEach((genre) => {
      const key = String(genre);
      tally.set(key, (tally.get(key) || 0) + 1);
    });
  });
  return Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre]) => genre);
};

export default function useProfileData(uid) {
  const [profile, setProfile] = useState(null);
  const [animeItems, setAnimeItems] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadedAnime, setLoadedAnime] = useState(false);
  const [loadedActivity, setLoadedActivity] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState(false);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setAnimeItems([]);
      setActivity([]);
      setLoadedAnime(true);
      setLoadedActivity(true);
      setLoadedProfile(true);
      return undefined;
    }
    const { db } = getFirebaseClient();
    if (!db) {
      setLoadedProfile(true);
      setLoadedAnime(true);
      setLoadedActivity(true);
      return undefined;
    }

    const profileRef = doc(db, 'users', uid);
    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      setProfile(snapshot.exists() ? snapshot.data() : null);
      setLoadedProfile(true);
    });

    const animeRef = collection(db, 'users', uid, 'anime');
    const animeQuery = query(animeRef, orderBy('updatedAt', 'desc'));
    const unsubscribeAnime = onSnapshot(animeQuery, (snapshot) => {
      setAnimeItems(snapshot.docs.map((docItem) => docItem.data()));
      setLoadedAnime(true);
    });

    const activityRef = collection(db, 'users', uid, 'activity');
    const activityQuery = query(activityRef, orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      setActivity(snapshot.docs.map((docItem) => docItem.data()));
      setLoadedActivity(true);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAnime();
      unsubscribeActivity();
    };
  }, [uid]);

  const stats = useMemo(() => computeStats(animeItems), [animeItems]);
  const genres = useMemo(() => computeGenres(animeItems), [animeItems]);
  const favorites = useMemo(
    () => animeItems.filter((item) => item.isFavorite).slice(0, 4),
    [animeItems],
  );

  return {
    stats,
    genres,
    favorites,
    activity,
    profile,
    loading: !(loadedAnime && loadedActivity && loadedProfile),
    animeItems,
  };
}
