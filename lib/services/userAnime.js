import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

const normalizeGenres = (genres) => {
  if (!Array.isArray(genres)) return [];
  return genres.map((entry) => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean);
};

export const buildUserAnimePayload = ({ uid, anime, overrides = {} }) => {
  if (!uid || !anime) return null;
  const animeId = String(anime.mal_id ?? anime.id ?? anime.animeId ?? '');
  if (!animeId) return null;

  return {
    uid,
    animeId,
    title: anime.title || anime.title_english || 'Untitled',
    posterUrl: anime.image || anime.posterUrl || '',
    year: anime.year || anime?.aired?.prop?.from?.year || null,
    type: anime.type || anime.format || 'Series',
    episodesTotal: anime.episodes ?? anime.episodesTotal ?? null,
    malScore: anime.score ?? anime.malScore ?? null,
    genres: normalizeGenres(anime.genres),
    status: 'plan',
    progress: 0,
    rating: null,
    isFavorite: false,
    personalRank: null,
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
};

export const upsertUserAnime = async ({ uid, anime, overrides }) => {
  const { db } = getFirebaseClient();
  if (!db || !uid) return false;
  const payload = buildUserAnimePayload({ uid, anime, overrides });
  if (!payload) return false;
  await setDoc(doc(db, 'users', uid, 'anime', payload.animeId), payload, { merge: true });
  return true;
};

export const updateUserAnime = async ({ uid, animeId, patch }) => {
  const { db } = getFirebaseClient();
  if (!db || !uid || !animeId) return false;
  await setDoc(
    doc(db, 'users', uid, 'anime', String(animeId)),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
};

export const addUserActivity = async ({ uid, activity }) => {
  const { db } = getFirebaseClient();
  if (!db || !uid) return false;
  const collectionRef = collection(db, 'users', uid, 'activity');
  const activityRef = doc(collectionRef);
  await setDoc(activityRef, {
    ...activity,
    createdAt: serverTimestamp(),
  });
  return true;
};
