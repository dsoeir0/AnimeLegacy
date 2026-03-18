import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';
import { isAiringAnime } from '../lib/utils/anime';
import { getAnimeById } from '../lib/services/jikan';
import { ensureAnimeCatalog } from '../lib/services/animeCatalog';

const EPISODE_MINUTES = 24;

const computeStats = (items) => {
  const normalizeStatus = (item) =>
    isAiringAnime(item) && item.status === 'completed' ? 'watching' : item.status;
  const watchedCount = items.filter((item) => normalizeStatus(item) === 'completed').length;
  const totalEpisodes = items.reduce((sum, item) => {
    if (typeof item.progress === 'number') return sum + item.progress;
    if (normalizeStatus(item) === 'completed' && typeof item.episodesTotal === 'number') {
      return sum + item.episodesTotal;
    }
    return sum;
  }, 0);
  const daysSpent = (totalEpisodes * EPISODE_MINUTES) / 60 / 24;
  const scored = items.filter((item) => typeof item.rating === 'number');
  const myAvgScore = scored.length
    ? scored.reduce((sum, item) => sum + item.rating, 0) / scored.length
    : null;
  const malScored = items.filter((item) => typeof item.malScore === 'number');
  const malAvgScore = malScored.length
    ? malScored.reduce((sum, item) => sum + item.malScore, 0) / malScored.length
    : null;
  const reviewCount = items.filter(
    (item) => typeof item.review === 'string' && item.review.trim().length > 0,
  ).length;

  return {
    watchedCount,
    totalEpisodes,
    daysSpent,
    myAvgScore,
    malAvgScore,
    reviewCount,
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
    .slice(0, 5)
    .map(([genre]) => genre);
};

export default function useProfileData(uid) {
  const [profile, setProfile] = useState(null);
  const [animeItems, setAnimeItems] = useState([]);
  const [listItems, setListItems] = useState([]);
  const [activity, setActivity] = useState([]);
  const [catalogGenres, setCatalogGenres] = useState({});
  const [loadedAnime, setLoadedAnime] = useState(false);
  const [loadedList, setLoadedList] = useState(false);
  const [loadedActivity, setLoadedActivity] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState(false);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setAnimeItems([]);
      setListItems([]);
      setActivity([]);
      setLoadedAnime(true);
      setLoadedList(true);
      setLoadedActivity(true);
      setLoadedProfile(true);
      return undefined;
    }
    const { db } = getFirebaseClient();
    if (!db) {
      setLoadedProfile(true);
      setLoadedAnime(true);
      setLoadedList(true);
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

    const listRef = collection(db, 'users', uid, 'list');
    const listQuery = query(listRef, orderBy('addedAt', 'desc'));
    const unsubscribeList = onSnapshot(listQuery, (snapshot) => {
      setListItems(snapshot.docs.map((docItem) => docItem.data()));
      setLoadedList(true);
    });

    const activityRef = collection(db, 'users', uid, 'activity');
    const activityQuery = query(activityRef, orderBy('createdAt', 'desc'), limit(12));
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      setActivity(snapshot.docs.map((docItem) => docItem.data()));
      setLoadedActivity(true);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAnime();
      unsubscribeList();
      unsubscribeActivity();
    };
  }, [uid]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    if (!db || listItems.length === 0) {
      setCatalogGenres({});
      return;
    }
    let isActive = true;
    const animeById = new Map(
      animeItems.map((item) => [String(item?.animeId ?? item?.id ?? ''), item]),
    );
    const watchedIds = new Set();
    listItems.forEach((item) => {
      const progress = Number(item?.progress ?? 0);
      if (progress > 0) watchedIds.add(String(item?.animeId ?? item?.id ?? ''));
    });
    animeItems.forEach((item) => {
      const progress = Number(item?.progress ?? 0);
      if (progress > 0) watchedIds.add(String(item?.animeId ?? item?.id ?? ''));
    });

    const idsToFetch = Array.from(watchedIds)
      .filter(Boolean)
      .filter((id) => {
        const listItem = listItems.find((entry) => String(entry?.animeId ?? entry?.id ?? '') === id);
        const animeItem = animeById.get(id);
        const hasGenres =
          (Array.isArray(listItem?.genres) && listItem.genres.length > 0) ||
          (Array.isArray(animeItem?.genres) && animeItem.genres.length > 0);
        return !hasGenres;
      });

    if (idsToFetch.length === 0) {
      setCatalogGenres({});
      return;
    }

    const fetchGenres = async () => {
      try {
        const entries = await Promise.all(
          idsToFetch.map(async (id) => {
            const snapshot = await getDoc(doc(db, 'anime', id));
            if (!snapshot.exists()) return [id, []];
            const data = snapshot.data();
            return [id, Array.isArray(data?.genres) ? data.genres : []];
          }),
        );
        if (!isActive) return;
        const next = {};
        entries.forEach(([id, genres]) => {
          if (genres && genres.length > 0) next[id] = genres;
        });
        setCatalogGenres(next);
      } catch {
        // Ignore catalog hydration errors; we'll retry on next run.
      }
    };

    fetchGenres();

    return () => {
      isActive = false;
    };
  }, [listItems, animeItems]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    if (!db || !uid) return undefined;
    const watchedIds = new Set();
    listItems.forEach((item) => {
      const progress = Number(item?.progress ?? 0);
      if (progress > 0) watchedIds.add(String(item?.animeId ?? item?.id ?? ''));
    });
    animeItems.forEach((item) => {
      const progress = Number(item?.progress ?? 0);
      if (progress > 0) watchedIds.add(String(item?.animeId ?? item?.id ?? ''));
    });
    const idsToHydrate = Array.from(watchedIds)
      .filter(Boolean)
      .filter((id) => {
        const listItem = listItems.find((entry) => String(entry?.animeId ?? entry?.id ?? '') === id);
        const animeItem = animeItems.find((entry) => String(entry?.animeId ?? entry?.id ?? '') === id);
        const hasGenres =
          (Array.isArray(listItem?.genres) && listItem.genres.length > 0) ||
          (Array.isArray(animeItem?.genres) && animeItem.genres.length > 0) ||
          (Array.isArray(catalogGenres[id]) && catalogGenres[id].length > 0);
        return !hasGenres;
      })
      .slice(0, 10);

    if (idsToHydrate.length === 0) return undefined;

    let cancelled = false;

    const hydrate = async () => {
      await Promise.all(
        idsToHydrate.map(async (id) => {
          try {
            const response = await getAnimeById(id);
            const data = response?.data;
            if (!data || cancelled) return;
            const genres = Array.isArray(data.genres)
              ? data.genres.map((entry) => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean)
              : [];
            if (genres.length === 0) return;
            await Promise.all([
              setDoc(doc(db, 'users', uid, 'list', id), { genres }, { merge: true }),
              setDoc(doc(db, 'users', uid, 'anime', id), { genres }, { merge: true }),
              ensureAnimeCatalog(data),
            ]);
          } catch {
            // Ignore hydration errors; we will retry on next load.
          }
        }),
      );
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [uid, listItems, animeItems, catalogGenres]);

  const stats = useMemo(() => computeStats(animeItems), [animeItems]);
  const watchedGenres = useMemo(() => {
    const animeById = new Map(
      animeItems.map((item) => [String(item?.animeId ?? item?.id ?? ''), item]),
    );
    const watchedIds = new Set();
    listItems.forEach((item) => {
      const progress = Number(item?.progress ?? 0);
      if (progress > 0) watchedIds.add(String(item?.animeId ?? item?.id ?? ''));
    });
    animeItems.forEach((item) => {
      const progress = Number(item?.progress ?? 0);
      if (progress > 0) watchedIds.add(String(item?.animeId ?? item?.id ?? ''));
    });

    const watchedItems = Array.from(watchedIds)
      .filter(Boolean)
      .map((id) => {
        const listItem = listItems.find(
          (entry) => String(entry?.animeId ?? entry?.id ?? '') === id,
        );
        const fallback = animeById.get(id);
        if (Array.isArray(listItem?.genres) && listItem.genres.length > 0) return listItem;
        if (Array.isArray(fallback?.genres) && fallback.genres.length > 0) return fallback;
        const catalog = catalogGenres[id];
        if (Array.isArray(catalog) && catalog.length > 0) {
          return { ...(listItem || fallback || { animeId: id }), genres: catalog };
        }
        return listItem || fallback || { animeId: id, genres: [] };
      });
    return computeGenres(watchedItems);
  }, [listItems, animeItems, catalogGenres]);
  const favorites = useMemo(
    () => animeItems.filter((item) => item.isFavorite).slice(0, 10),
    [animeItems],
  );
  const filteredActivity = useMemo(() => {
    const listIds = new Set(
      listItems.map((item) => String(item.id ?? item.animeId ?? '')).filter(Boolean),
    );
    if (listIds.size === 0) return [];
    return activity
      .filter((entry) => {
        if (!entry) return false;
        if (entry.type === 'added_to_list' || entry.type === 'removed_from_list') return false;
        const animeId = String(entry.animeId ?? '');
        if (!animeId) return false;
        return listIds.has(animeId);
      })
      .slice(0, 3);
  }, [activity, listItems]);

  const filteredActivityAll = useMemo(() => {
    const listIds = new Set(
      listItems.map((item) => String(item.id ?? item.animeId ?? '')).filter(Boolean),
    );
    if (listIds.size === 0) return [];
    return activity.filter((entry) => {
      if (!entry) return false;
      if (entry.type === 'added_to_list' || entry.type === 'removed_from_list') return false;
      const animeId = String(entry.animeId ?? '');
      if (!animeId) return false;
      return listIds.has(animeId);
    });
  }, [activity, listItems]);

  return {
    stats,
    genres: watchedGenres,
    favorites,
    activity: filteredActivity,
    activityAll: filteredActivityAll,
    profile,
    loading: !(loadedAnime && loadedList && loadedActivity && loadedProfile),
    animeItems,
  };
}
