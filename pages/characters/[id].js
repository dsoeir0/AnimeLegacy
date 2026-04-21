import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import styles from './[id].module.css';
import useAuth from '../../hooks/useAuth';
import {
  getCharacterAnime,
  getCharacterById,
  getCharacterVoices,
} from '../../lib/services/jikan';
import { getAnimeImageUrl, getCharacterImageUrl } from '../../lib/utils/media';
import { getFirebaseClient } from '../../lib/firebase/client';
import { FAVORITE_LIMIT } from '../../lib/constants';

const buildBio = (about = '') =>
  about
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().startsWith('(source'));

const toStatValue = (value, fallback = '—') => (value ? String(value) : fallback);

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
  const voicesRaw = Array.isArray(characterVoicesResposta?.data) ? characterVoicesResposta.data : [];
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
  const imageUrl = getCharacterImageUrl(character) || '/logo_no_text.png';
  const biography = buildBio(character?.about || '');
  const [showAllAppearances, setShowAllAppearances] = useState(false);
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
      const ids = snapshot.docs.map((d) => String(d.id));
      setFavoriteCount(ids.length);
      setIsFavorite(ids.includes(String(character.mal_id)));
      setFavoriteLoaded(true);
    });
    return () => unsubscribe();
  }, [character?.mal_id, user?.uid]);

  useEffect(() => {
    let unsubscribe = null;
    if (!character?.mal_id) return undefined;
    const { db } = getFirebaseClient();
    if (!db) {
      setFavoriteTotal(0);
      return undefined;
    }
    const ref = doc(db, 'characterStats', String(character.mal_id));
    unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setFavoriteTotal(snap.data()?.favoritesCount || 0);
        else setFavoriteTotal(0);
      },
      () => setFavoriteTotal(0),
    );
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
      setFavoriteError('Loading favorites…');
      return;
    }
    const next = !isFavorite;
    if (next && favoriteCount >= FAVORITE_LIMIT) {
      setFavoriteError(`You can only favorite up to ${FAVORITE_LIMIT} characters.`);
      return;
    }
    setFavoriteError('');
    setIsFavorite(next);
    const delta = next ? 1 : -1;
    setFavoriteTotal((c) => Math.max(0, (c || 0) + delta));
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

  const ageValue = useMemo(() => character?.age || parseBioValue('Age', character?.about || ''), [character]);
  const heightValue = useMemo(() => character?.height || parseBioValue('Height', character?.about || ''), [character]);
  const genderValue = useMemo(
    () =>
      character?.gender ||
      parseBioValue('Gender', character?.about || '') ||
      parseBioValue('Sex', character?.about || '') ||
      inferGenderFromAbout(character?.about || ''),
    [character],
  );

  const stats = [
    { label: 'FAVORITES', value: toStatValue(favoriteTotal, '0') },
    { label: 'AGE', value: toStatValue(ageValue) },
    { label: 'HEIGHT', value: toStatValue(heightValue) },
    { label: 'GENDER', value: toStatValue(genderValue) },
  ];

  const nicknameTags = Array.isArray(character?.nicknames) ? character.nicknames : [];
  const visibleAppearances = showAllAppearances ? anime : anime.slice(0, 6);

  return (
    <Layout
      title={`${character?.name || 'Character'} · AnimeLegacy`}
      description={character?.about || 'Character profile and appearances.'}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroImageFrame}>
            <Image
              src={imageUrl}
              alt={character?.name || 'Character'}
              fill
              sizes="(max-width: 900px) 100vw, 360px"
              className={styles.heroImage}

            />
          </div>
          <div className={styles.heroBody}>
            <div className={styles.eyebrow}>CHARACTER PROFILE</div>
            <h1 className={styles.title}>{character?.name || 'Unknown'}</h1>
            {character?.name_kanji ? (
              <div className={styles.subTitle}>{character.name_kanji}</div>
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
              {stats.map((s) => (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statLabel}>{s.label}</div>
                  <div className={styles.statValue}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className={styles.favoriteCard}>
              <div className={styles.favoriteLeft}>
                <div className={styles.favoriteTitle}>Favorite character</div>
                <div className={styles.favoriteHint}>
                  {isFavorite
                    ? 'Showcased on your profile.'
                    : 'Mark to feature on your profile.'}
                  {favoriteError ? <span className={styles.favoriteError}> {favoriteError}</span> : null}
                </div>
              </div>
              <Button
                variant={isFavorite ? 'collection' : 'secondary'}
                size="md"
                icon={Star}
                onClick={toggleFavorite}
                disabled={!user?.uid || !favoriteLoaded}
              >
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Button>
            </div>

            <div className={styles.bioCard}>
              <div className={styles.sectionEyebrow}>BIOGRAPHY</div>
              {biography.length ? (
                biography.map((p, i) => (
                  <p key={`${p}-${i}`} className={styles.bioText}>
                    {p}
                  </p>
                ))
              ) : (
                <p className={styles.bioText}>Biography unavailable.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeadRow}>
            <div>
              <div className={styles.sectionEyebrow}>APPEARANCES</div>
              <h2 className={styles.sectionTitle}>Major appearances</h2>
            </div>
            {anime.length > 6 ? (
              <Button
                variant="plain"
                size="sm"
                iconRight={ArrowRight}
                onClick={() => setShowAllAppearances((p) => !p)}
              >
                {showAllAppearances ? 'Show less' : 'View all'}
              </Button>
            ) : null}
          </div>
          <div className={styles.appearanceGrid}>
            {visibleAppearances.length ? (
              visibleAppearances.map((entry) => {
                const title = entry?.anime?.title || 'Unknown anime';
                const image = getAnimeImageUrl(entry?.anime) || '/logo_no_text.png';
                const animeId = entry?.anime?.mal_id;
                return (
                  <Link
                    key={`${title}-${animeId || ''}`}
                    href={animeId ? `/anime/${animeId}` : '#'}
                    className={styles.appearanceCard}
                  >
                    <div className={styles.appearancePoster}>
                      <Image
                        src={image}
                        alt={title}
                        fill
                        sizes="(max-width: 900px) 45vw, 200px"
                        className={styles.posterImg}

                      />
                      <div className={styles.appearanceGradient} />
                      <span className={styles.appearanceBadge}>{entry?.anime?.type || 'TV'}</span>
                    </div>
                    <div className={styles.appearanceMeta}>
                      <div className={styles.appearanceTitle}>{title}</div>
                      <div className={styles.appearanceRole}>{entry?.role || 'Role'}</div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className={styles.empty}>Appearances unavailable.</p>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeadRow}>
            <div>
              <div className={styles.sectionEyebrow}>CAST</div>
              <h2 className={styles.sectionTitle}>Voice actors</h2>
            </div>
            <span className={styles.eyebrowInline}>{voices.length} LISTED</span>
          </div>
          <div className={styles.voiceGrid}>
            {voices.length ? (
              voices.map((entry) => {
                const actor = entry?.person;
                const actorImage =
                  actor?.images?.webp?.image_url ||
                  actor?.images?.jpg?.image_url ||
                  '/logo_no_text.png';
                return (
                  <div key={`${actor?.name}-${actor?.mal_id || ''}`} className={styles.voiceCard}>
                    <div className={styles.voiceAvatar}>
                      <Image src={actorImage} alt={actor?.name || 'VA'} fill sizes="72px" className={styles.posterImg}/>
                    </div>
                    <div className={styles.voiceMeta}>
                      <div className={styles.voiceName}>{actor?.name || 'Unknown'}</div>
                      <div className={styles.voiceLang}>{entry?.language || '—'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={styles.empty}>Voice actors unavailable.</p>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.query;
  const [characterResposta, characterAnimeResposta, characterVoicesResposta] = await Promise.all([
    getCharacterById(id),
    getCharacterAnime(id),
    getCharacterVoices(id),
  ]);
  return { props: { characterResposta, characterAnimeResposta, characterVoicesResposta } };
}
