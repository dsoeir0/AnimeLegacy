import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../firebase/client';

const normalizeGenres = (genres) => {
  if (!Array.isArray(genres)) return [];
  return genres.map((entry) => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean);
};

const buildAnimeCatalogPayload = (anime) => {
  if (!anime) return null;
  const animeId = String(anime.mal_id ?? anime.id ?? anime.animeId ?? '');
  if (!animeId) return null;

  return {
    animeId,
    title: anime.title || anime.title_english || 'Untitled',
    posterUrl: anime.image || anime.posterUrl || '',
    bannerUrl: anime.bannerUrl || '',
    year: anime.year || anime?.aired?.prop?.from?.year || null,
    season: anime.season || null,
    type: anime.type || anime.format || 'Series',
    status: anime.status || (anime.airing ? 'Airing' : null),
    episodesTotal: anime.episodes ?? anime.episodesTotal ?? null,
    durationMin: anime.durationMin ?? null,
    genres: normalizeGenres(anime.genres),
    studios: normalizeGenres(anime.studios),
    malScore: anime.score ?? anime.malScore ?? null,
    updatedAt: serverTimestamp(),
  };
};

export const ensureAnimeCatalog = async (anime) => {
  const { db } = getFirebaseClient();
  if (!db) return false;
  const payload = buildAnimeCatalogPayload(anime);
  if (!payload) return false;
  await setDoc(doc(db, 'anime', payload.animeId), payload, { merge: true });
  return true;
};
