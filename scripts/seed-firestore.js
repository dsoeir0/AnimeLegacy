/* eslint-disable no-console */
const { FieldValue } = require('firebase-admin/firestore');
const { getAdminDb } = require('../lib/firebase/admin');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const uidIndex = args.indexOf('--uid');
  if (uidIndex !== -1 && args[uidIndex + 1]) {
    return { uid: args[uidIndex + 1] };
  }
  return { uid: process.env.SEED_UID };
};

const sampleAnime = [
  {
    animeId: '1',
    title: 'Echoes of Valhalla: Rebirth',
    posterUrl: '/logo_no_text.png',
    year: 2025,
    type: 'TV',
    episodesTotal: 12,
    genres: ['Action', 'Drama'],
  },
  {
    animeId: '2',
    title: 'Shadow Sovereign Season 2',
    posterUrl: '/logo_no_text.png',
    year: 2024,
    type: 'TV',
    episodesTotal: 24,
    genres: ['Fantasy', 'Adventure'],
  },
  {
    animeId: '3',
    title: 'Galactic Horizon',
    posterUrl: '/logo_no_text.png',
    year: 2023,
    type: 'TV',
    episodesTotal: 10,
    genres: ['Sci-Fi', 'Space'],
  },
  {
    animeId: '4',
    title: 'Winter Bloom',
    posterUrl: '/logo_no_text.png',
    year: 2022,
    type: 'Movie',
    episodesTotal: 1,
    genres: ['Romance', 'Slice of Life'],
  },
];

const seed = async () => {
  const { uid } = parseArgs();
  if (!uid) {
    throw new Error('Missing --uid. Example: node scripts/seed-firestore.js --uid YOUR_UID');
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error(
      'Firebase Admin is not configured. Check FIREBASE_ADMIN_* env vars or config/firebase-admin.json',
    );
  }

  const batch = db.batch();

  sampleAnime.forEach((anime, index) => {
    const animeRef = db.collection('anime').doc(anime.animeId);
    batch.set(
      animeRef,
      {
        ...anime,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const userAnimeRef = db.collection('users').doc(uid).collection('anime').doc(anime.animeId);
    batch.set(
      userAnimeRef,
      {
        uid,
        ...anime,
        status: index === 0 ? 'watching' : index === 2 ? 'completed' : 'plan',
        progress: index === 2 ? anime.episodesTotal : index === 0 ? 6 : 0,
        rating: index === 2 ? 9.0 : null,
        isFavorite: index < 3,
        personalRank: index < 3 ? index + 1 : null,
        addedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const activityRef = db.collection('users').doc(uid).collection('activity').doc();
    batch.set(activityRef, {
      animeId: anime.animeId,
      title: anime.title,
      posterUrl: anime.posterUrl,
      type: 'seed',
      label: index === 2 ? 'Completed series - Score 9.0' : 'Added to Plan to Watch',
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log('Seed complete.');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
