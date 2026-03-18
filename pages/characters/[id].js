import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import styles from '../../styles/character.module.css';
import useAuth from '../../hooks/useAuth';
import {
  getCharacterAnime,
  getCharacterById,
  getCharacterVoices,
} from '../../lib/services/jikan';
import { getAnimeImageUrl, getCharacterImageUrl } from '../../lib/utils/media';
import { getFirebaseClient } from '../../lib/firebase/client';
import { collection, deleteDoc, doc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

const buildBio = (about = '') =>
  about
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().startsWith('(source'));

const toStatValue = (value, fallback = 'Unknown') =>
  value ? String(value) : fallback;

const parseBioValue = (label, about = '') => {
  if (!about) return '';
  const lines = about.split('\n').map((line) => line.trim());
  const match = lines.find((line) => line.toLowerCase().startsWith(label.toLowerCase()));
  if (!match) return '';
  const [, value] = match.split(':');
  return value ? value.trim() : '';
};

const inferGenderFromAbout = (about = '') => {
  const lowered = about.toLowerCase();
  if (lowered.includes(' female')) return 'Female';
  if (lowered.includes(' male')) return 'Male';
  if (lowered.includes(' she ') || lowered.includes(' her ')) return 'Female';
  if (lowered.includes(' he ') || lowered.includes(' his ')) return 'Male';
  return '';
};

export default function CharacterPage({
  characterResposta,
  characterAnimeResposta,
  characterVoicesResposta,
}) {
  const character = characterResposta?.data || {};
  const anime = Array.isArray(characterAnimeResposta?.data) ? characterAnimeResposta.data : [];
  const voicesRaw = Array.isArray(characterVoicesResposta?.data)
    ? characterVoicesResposta.data
    : [];
  const voices = useMemo(() => {
    const priority = ['Japanese', 'English'];
    const rank = (lang) => {
      const index = priority.indexOf(lang);
      return index === -1 ? priority.length + 1 : index;
    };
    return [...voicesRaw].sort((a, b) => {
      const aLang = a?.language || '';
      const bLang = b?.language || '';
      const diff = rank(aLang) - rank(bLang);
      if (diff !== 0) return diff;
      return aLang.localeCompare(bLang);
    });
  }, [voicesRaw]);
  const imageUrl = getCharacterImageUrl(character);
  const biography = buildBio(character?.about || '');
  const showAllDefault = false;
  const [showAllAppearances, setShowAllAppearances] = useState(showAllDefault);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  const [favoriteTotal, setFavoriteTotal] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteLoaded, setFavoriteLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!character?.mal_id || !user?.uid) return undefined;
    const { db } = getFirebaseClient();
    if (!db) return undefined;
    const favoritesRef = collection(db, 'users', user.uid, 'favoriteCharacters');
    const unsubscribe = onSnapshot(favoritesRef, (snapshot) => {
      const ids = snapshot.docs.map((docItem) => String(docItem.id));
      setFavoriteCount(ids.length);
      setIsFavorite(ids.includes(String(character.mal_id)));
      setFavoriteLoaded(true);
    });
    return () => unsubscribe();
  }, [character?.mal_id, user?.uid]);

  useEffect(() => {
    let unsubscribe = null;
    const loadFavorites = () => {
      if (!character?.mal_id) return;
      const { db } = getFirebaseClient();
      if (!db) {
        setFavoriteTotal(0);
        return;
      }
      const ref = doc(db, 'characterStats', String(character.mal_id));
      unsubscribe = onSnapshot(
        ref,
        (snapshot) => {
          if (snapshot.exists()) {
            const count = snapshot.data()?.favoritesCount;
            setFavoriteTotal(typeof count === 'number' ? count : 0);
          } else {
            setFavoriteTotal(0);
          }
        },
        () => {
          setFavoriteTotal(0);
        },
      );
    };
    loadFavorites();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [character?.mal_id]);

  const toggleFavorite = async () => {
    if (!character?.mal_id || typeof window === 'undefined') return;
    if (!user?.uid) {
      setFavoriteError('Sign in to favorite characters.');
      return;
    }
    if (!favoriteLoaded) {
      setFavoriteError('Loading favorites...');
      return;
    }
    const next = !isFavorite;
    if (next && favoriteCount >= 10) {
      setFavoriteError('You can only favorite up to 10 characters.');
      return;
    }
    setFavoriteError('');
    setIsFavorite(next);

    const delta = next ? 1 : -1;
    setFavoriteTotal((current) => {
      const base = typeof current === 'number' ? current : 0;
      return Math.max(0, base + delta);
    });
    const { db } = getFirebaseClient();
    if (db) {
      try {
        const characterId = String(character.mal_id);
        const statsRef = doc(db, 'characterStats', characterId);
        await setDoc(statsRef, { favoritesCount: increment(delta) }, { merge: true });

        const favoriteRef = doc(db, 'users', user.uid, 'favoriteCharacters', characterId);
        if (next) {
          await setDoc(
            favoriteRef,
            {
              id: characterId,
              name: character?.name || 'Unknown Character',
              nameKanji: character?.name_kanji || '',
              imageUrl: imageUrl || '',
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          await deleteDoc(favoriteRef);
        }
      } catch {
        setFavoriteError('Global favorites unavailable right now.');
      }
    }
  };

  const ageValue = useMemo(
    () => character?.age || parseBioValue('Age', character?.about || ''),
    [character?.age, character?.about],
  );
  const heightValue = useMemo(
    () => character?.height || parseBioValue('Height', character?.about || ''),
    [character?.height, character?.about],
  );
  const genderValue = useMemo(
    () =>
      character?.gender ||
      parseBioValue('Gender', character?.about || '') ||
      parseBioValue('Sex', character?.about || '') ||
      inferGenderFromAbout(character?.about || ''),
    [character?.gender, character?.about],
  );

  const stats = [
    { label: 'Favorites', value: toStatValue(favoriteTotal, '0') },
    { label: 'Age', value: toStatValue(ageValue) },
    { label: 'Height', value: toStatValue(heightValue) },
    { label: 'Gender', value: toStatValue(genderValue) },
  ];

  const nicknameTags = Array.isArray(character?.nicknames) ? character.nicknames : [];

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title={`AnimeLegacy - ${character?.name || 'Character'}`}
      description={character?.about || 'Character profile and appearances.'}
    >
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroImage}>
            <div className={styles.heroImageFrame}>
              <Image
                src={imageUrl || '/logo_no_text.png'}
                alt={character?.name || 'Character'}
                fill
                sizes="(max-width: 900px) 100vw, 420px"
                className={styles.heroImageMedia}
              />
            </div>
          </div>
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>Character Profile</div>
            <h1 className={styles.heroTitle}>{character?.name || 'Unknown Character'}</h1>
            {character?.name_kanji ? (
              <p className={styles.heroSubtitle}>{character.name_kanji}</p>
            ) : null}
            {nicknameTags.length ? (
              <div className={styles.tagRow}>
                {nicknameTags.slice(0, 6).map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className={styles.statsGrid}>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.statCard}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
              <div className={styles.statCardWide}>
                <div className={styles.favoriteLabel}>Favorite</div>
                <button
                  className={styles.favoriteRow}
                  type="button"
                  onClick={toggleFavorite}
                  aria-pressed={isFavorite}
                  disabled={!user?.uid || !favoriteLoaded}
                >
                  <span
                    className={`${styles.favoriteIcon} ${
                      isFavorite ? styles.favoriteIconActive : ''
                    }`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                  <span>{isFavorite ? 'Favorited' : 'Mark as favorite'}</span>
                </button>
                <div className={styles.favoriteHint}>
                  Favorites appear on your profile.
                  {favoriteError ? (
                    <span className={styles.favoriteError}>{favoriteError}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className={styles.bioCard}>
              <div className={styles.bioHeader}>Biography</div>
              {biography.length ? (
                biography.map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`} className={styles.bioText}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className={styles.bioText}>Biography unavailable.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Major Appearances</h2>
            {anime.length > 5 ? (
              <button
                className={styles.sectionToggle}
                type="button"
                onClick={() => setShowAllAppearances((prev) => !prev)}
              >
                {showAllAppearances ? 'Show Less' : 'View All'}
              </button>
            ) : null}
          </div>
          <div className={styles.appearanceGrid}>
            {anime.length ? (
              anime
                .slice(0, showAllAppearances ? anime.length : 5)
                .map((entry) => {
                const title = entry?.anime?.title || 'Unknown Anime';
                const image = getAnimeImageUrl(entry?.anime);
                const typeLabel = entry?.anime?.type || 'TV';
                const roleLabel = entry?.role || 'Role';
                const animeId = entry?.anime?.mal_id;
                return (
                  <Link
                    key={`${title}-${animeId || ''}`}
                    href={animeId ? `/anime/${animeId}` : '#'}
                    className={styles.appearanceCard}
                  >
                    <div className={styles.appearancePoster}>
                      <Image
                        src={image || '/logo_no_text.png'}
                        alt={title}
                        fill
                        sizes="(max-width: 900px) 45vw, 220px"
                      />
                      <span className={styles.appearanceBadge}>{typeLabel}</span>
                    </div>
                    <div className={styles.appearanceTitle}>{title}</div>
                    <div className={styles.appearanceMeta}>
                      <span className={styles.appearanceMetaLabel}>Role</span>
                      <span className={styles.appearanceMetaValue}>{roleLabel}</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className={styles.emptyState}>Appearances unavailable.</p>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Voice Actors</h2>
            <span className={styles.sectionHint}>{voices.length} listed</span>
          </div>
          <div className={styles.voiceGrid}>
            {voices.length ? (
              voices.map((entry) => {
                const actor = entry?.person;
                const actorName = actor?.name || 'Unknown';
                const actorImage =
                  actor?.images?.jpg?.image_url || actor?.images?.webp?.image_url || '/logo_no_text.png';
                return (
                  <div key={`${actorName}-${actor?.mal_id || ''}`} className={styles.voiceCard}>
                    <div className={styles.voiceAvatar}>
                      <Image
                        src={actorImage}
                        alt={actorName}
                        fill
                        sizes="72px"
                      />
                    </div>
                    <div>
                      <div className={styles.voiceName}>{actorName}</div>
                      <div className={styles.voiceLang}>{entry?.language || 'Unknown'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={styles.emptyState}>Voice actors unavailable.</p>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.query;

  const [characterResposta, characterAnimeResposta, characterVoicesResposta] =
    await Promise.all([getCharacterById(id), getCharacterAnime(id), getCharacterVoices(id)]);

  return {
    props: { characterResposta, characterAnimeResposta, characterVoicesResposta },
  };
}
