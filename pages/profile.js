import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { updateProfile } from 'firebase/auth';
import { X, Pencil, LogOut, Star } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Skeleton, { SkeletonText } from '../components/ui/Skeleton';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { formatRelativeTime } from '../lib/utils/time';
import { formatSeasonLabel, getSeasonFromDate } from '../lib/utils/season';
import { claimUsername, getUserProfile, upsertUserProfile } from '../lib/services/userProfile';
import { getFirebaseClient } from '../lib/firebase/client';
import { isAiringAnime } from '../lib/utils/anime';
import { MAX_AVATAR_SIZE_BYTES, MAX_AVATAR_SIZE_LABEL } from '../lib/constants';
import styles from './profile.module.css';

const TABS = ['Overview', 'Favorites', 'Reviews', 'Activity'];

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);

export default function ProfilePage() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const router = useRouter();
  const {
    stats,
    genres,
    favorites,
    favoriteCharacters,
    activity,
    activityAll,
    profile,
    animeItems,
    loading: profileLoading,
  } = useProfileData(user?.uid);
  const displayName = profile?.username || user?.displayName || 'Guest';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL;
  const initials = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);
  const bio = profile?.bio || 'No bio yet — tell the chronicle what you are watching.';
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const currentSeason = getSeasonFromDate();
  const currentYear = new Date().getFullYear();
  const seasonLabel = formatSeasonLabel(currentSeason, currentYear);

  const seasonalItems = useMemo(
    () =>
      (animeItems || []).filter(
        (item) => item?.season === currentSeason && item?.year === currentYear,
      ),
    [animeItems, currentSeason, currentYear],
  );

  const normalizeSeasonStatus = (item) =>
    isAiringAnime(item) && item?.status === 'completed' ? 'watching' : item?.status;

  const seasonalPlanned = useMemo(
    () =>
      seasonalItems.filter((item) => {
        const s = normalizeSeasonStatus(item);
        return s !== 'dropped' && s !== 'removed';
      }),
    [seasonalItems],
  );
  const seasonalCompleted = useMemo(
    () => seasonalItems.filter((item) => normalizeSeasonStatus(item) === 'completed'),
    [seasonalItems],
  );
  const seasonalProgress = seasonalPlanned.length
    ? Math.round((seasonalCompleted.length / seasonalPlanned.length) * 100)
    : 0;

  const reviews = useMemo(
    () =>
      (animeItems || []).filter((item) => {
        const hasRating = typeof item?.rating === 'number';
        const hasReview = Boolean(item?.review && String(item.review).trim().length > 0);
        return hasRating || hasReview;
      }),
    [animeItems],
  );

  const editPreview = useMemo(() => {
    if (!editAvatarFile) return '';
    return URL.createObjectURL(editAvatarFile);
  }, [editAvatarFile]);

  useEffect(() => () => editPreview && URL.revokeObjectURL(editPreview), [editPreview]);

  const statCards = [
    { label: 'WATCHED', value: stats.watchedCount ?? 0, sub: 'Anime' },
    { label: 'EPISODES', value: stats.totalEpisodes ?? 0, sub: 'Total' },
    { label: 'DAYS', value: stats.daysSpent ? stats.daysSpent.toFixed(1) : '0.0', sub: 'Spent' },
    { label: 'REVIEWS', value: stats.reviewCount ?? 0, sub: 'Written' },
    { label: 'AVG MAL', value: stats.malAvgScore ? stats.malAvgScore.toFixed(1) : '—', sub: 'Community' },
    { label: 'YOUR AVG', value: stats.myAvgScore ? stats.myAvgScore.toFixed(1) : '—', sub: 'Your mean' },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/sign-in');
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!isEditing) return;
    setEditUsername(profile?.username || user?.displayName || '');
    setEditBio(profile?.bio || '');
    setEditAvatarFile(null);
    setRemoveAvatar(false);
    setEditError('');
  }, [isEditing, profile?.bio, profile?.username, user?.displayName]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user?.uid) return;
    if (!editUsername.trim()) {
      setEditError('Username is required.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const current = await withTimeout(getUserProfile(user.uid), 15000, 'Profile load');
      if (current?.usernameLower !== editUsername.trim().toLowerCase()) {
        const claim = await withTimeout(
          claimUsername({ uid: user.uid, username: editUsername.trim() }),
          15000,
          'Username check',
        );
        if (!claim.ok) {
          setEditError('Username is already taken.');
          setSaving(false);
          return;
        }
      }
      let resolvedAvatar = current?.avatarData || '';
      if (removeAvatar) resolvedAvatar = '';
      if (editAvatarFile) {
        if (editAvatarFile.size > MAX_AVATAR_SIZE_BYTES) {
          setEditError(`Avatar must be under ${MAX_AVATAR_SIZE_LABEL}.`);
          setSaving(false);
          return;
        }
        const reader = new FileReader();
        resolvedAvatar = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image file.'));
          reader.readAsDataURL(editAvatarFile);
        });
      }
      const { auth } = getFirebaseClient();
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editUsername.trim(), photoURL: null });
      }
      await withTimeout(
        upsertUserProfile({
          uid: user.uid,
          username: editUsername.trim(),
          bio: editBio.trim(),
          avatarData: resolvedAvatar,
          email: user.email || '',
          displayName: editUsername.trim(),
        }),
        15000,
        'Profile save',
      );
      setIsEditing(false);
    } catch (err) {
      setEditError(err?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="AnimeLegacy · Profile" description="Your AnimeLegacy profile and activity.">
      <div className={styles.page}>
        {!user ? (
          <div className={styles.empty}>
            <h2>Redirecting…</h2>
            <p>Please log in to view your profile.</p>
          </div>
        ) : (
          <>
            <section className={styles.hero}>
              <div className={styles.heroRow}>
                <div className={styles.avatarFrame}>
                  {avatar ? (
                    <img src={avatar} alt={displayName} className={styles.avatarImg} />
                  ) : (
                    <span className={styles.avatarInitial}>{initials}</span>
                  )}
                </div>
                <div className={styles.heroMeta}>
                  <div className={styles.eyebrow}>PERSONAL CHRONICLE</div>
                  <h1 className={styles.heading}>{displayName}</h1>
                  <p className={styles.bio}>{bio}</p>
                </div>
                <div className={styles.heroActions}>
                  <Button variant="secondary" size="md" icon={Pencil} onClick={() => setIsEditing(true)}>
                    Edit profile
                  </Button>
                  <Button variant="ghost" size="md" icon={LogOut} onClick={signOutUser}>
                    Sign out
                  </Button>
                </div>
              </div>
            </section>

            <section className={styles.statsSection}>
              {profileLoading
                ? statCards.map((s) => (
                    <div key={s.label} className={styles.statCard}>
                      <div className={styles.statLabel}>{s.label}</div>
                      <Skeleton height={26} width="60%" style={{ margin: '4px 0 10px' }} />
                      <Skeleton height={10} width="40%" />
                    </div>
                  ))
                : statCards.map((s) => (
                    <div key={s.label} className={styles.statCard}>
                      <div className={styles.statLabel}>{s.label}</div>
                      <div className={styles.statValue}>{s.value}</div>
                      <div className={styles.statSub}>{s.sub}</div>
                    </div>
                  ))}
            </section>

            <div className={styles.layout}>
              <aside className={styles.aside}>
                <div className={styles.asideCard}>
                  <div className={styles.asideEyebrow}>TOP GENRES</div>
                  <div className={styles.genreTags}>
                    {genres.length ? (
                      genres.map((g) => (
                        <span key={g} className={styles.genreTag}>
                          {g}
                        </span>
                      ))
                    ) : (
                      <span className={styles.genreEmpty}>No genre data yet.</span>
                    )}
                  </div>
                </div>

                <div className={styles.asideCard}>
                  <div className={styles.asideHead}>
                    <div className={styles.asideEyebrow}>{seasonLabel?.toUpperCase() || 'SEASON'} PROGRESS</div>
                    <div className={styles.seasonBadge}>{seasonalProgress}%</div>
                  </div>
                  <p className={styles.seasonText}>
                    {seasonalCompleted.length} of {seasonalPlanned.length} planned shows completed.
                  </p>
                  <div className={styles.seasonTrack}>
                    <div className={styles.seasonFill} style={{ width: `${seasonalProgress}%` }} />
                  </div>
                  <Link href="/my-list" className={styles.seasonLink}>
                    <Button variant="ghost" size="sm" fullWidth>
                      Open my list
                    </Button>
                  </Link>
                </div>
              </aside>

              <section className={styles.content}>
                <div className={styles.tabs} role="tablist">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      className={`${styles.tab} ${tab === activeTab ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'Overview' ? (
                  <>
                    <div className={styles.card}>
                      <div className={styles.cardHead}>
                        <h2 className={styles.cardTitle}>Recent activity</h2>
                      </div>
                      <div className={styles.activityList}>
                        {profileLoading ? (
                          Array.from({ length: 3 }, (_, i) => (
                            <div key={i} className={styles.activityItem}>
                              <div className={styles.activityThumb}>
                                <Skeleton width={44} height={60} rounded={6} />
                              </div>
                              <div className={styles.activityMeta}>
                                <SkeletonText lines={2} />
                              </div>
                            </div>
                          ))
                        ) : activity.length === 0 ? (
                          <div className={styles.emptyInline}>
                            Add anime to your list to start tracking updates.
                          </div>
                        ) : (
                          activity.map((entry, i) => (
                            <div key={`${entry.animeId || 'a'}-${i}`} className={styles.activityItem}>
                              <div className={styles.activityThumb}>
                                <Image
                                  src={entry.posterUrl || '/logo_no_text.png'}
                                  alt={entry.title || 'Activity'}
                                  width={44}
                                  height={60}

                                />
                              </div>
                              <div className={styles.activityMeta}>
                                <div className={styles.activityTitle}>{entry.title || 'Activity'}</div>
                                <div className={styles.activitySub}>{entry.label || entry.type || 'Updated'}</div>
                              </div>
                              <div className={styles.activityTime}>
                                {formatRelativeTime(entry.createdAt) || 'Just now'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

                {activeTab === 'Activity' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <h2 className={styles.cardTitle}>All activity</h2>
                      <span className={styles.cardHint}>{activityAll.length} updates</span>
                    </div>
                    <div className={styles.activityList}>
                      {activityAll.length === 0 ? (
                        <div className={styles.emptyInline}>No activity yet.</div>
                      ) : (
                        activityAll.map((entry, i) => (
                          <div key={`${entry.animeId || 'a'}-f-${i}`} className={styles.activityItem}>
                            <div className={styles.activityThumb}>
                              <Image
                                src={entry.posterUrl || '/logo_no_text.png'}
                                alt={entry.title || 'Activity'}
                                width={44}
                                height={60}

                              />
                            </div>
                            <div className={styles.activityMeta}>
                              <div className={styles.activityTitle}>{entry.title || 'Activity'}</div>
                              <div className={styles.activitySub}>{entry.label || entry.type || 'Updated'}</div>
                            </div>
                            <div className={styles.activityTime}>
                              {formatRelativeTime(entry.createdAt) || 'Just now'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'Reviews' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <h2 className={styles.cardTitle}>Your reviews</h2>
                      <span className={styles.cardHint}>{reviews.length} written</span>
                    </div>
                    {reviews.length === 0 ? (
                      <div className={styles.emptyInline}>
                        Share your thoughts on finished shows to build your review shelf.
                      </div>
                    ) : (
                      <div className={styles.reviewList}>
                        {reviews.map((entry) => {
                          const poster =
                            entry.posterUrl || entry.image || entry.coverImage || '/logo_no_text.png';
                          const targetId = entry.animeId || entry.id;
                          return (
                            <Link
                              key={targetId}
                              href={`/anime/${targetId}`}
                              className={styles.reviewCard}
                            >
                              <div className={styles.reviewPoster}>
                                <Image src={poster} alt={entry.title || 'Anime'} width={64} height={88}/>
                              </div>
                              <div className={styles.reviewMeta}>
                                <div className={styles.reviewTitle}>{entry.title || 'Untitled'}</div>
                                <div className={styles.reviewScore}>
                                  {typeof entry.rating === 'number' ? (
                                    <>
                                      <Star size={12} fill="currentColor" strokeWidth={0} />
                                      {entry.rating}/5
                                    </>
                                  ) : (
                                    'No rating'
                                  )}
                                </div>
                                {entry.review ? (
                                  <p className={styles.reviewText}>{entry.review}</p>
                                ) : null}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'Overview' || activeTab === 'Favorites' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <h2 className={styles.cardTitle}>All-time favorites</h2>
                      <span className={styles.cardHint}>{favorites.length}/10</span>
                    </div>
                    {favorites.length === 0 ? (
                      <div className={styles.emptyInline}>
                        Mark a completed anime as favorite to feature it here.
                      </div>
                    ) : (
                      <div className={styles.favoritesGrid}>
                        {favorites.map((favorite) => {
                          const favoriteId = favorite.animeId || favorite.id;
                          const poster = favorite.posterUrl || favorite.image || '/logo_no_text.png';
                          return (
                            <Link
                              key={favoriteId}
                              href={`/anime/${favoriteId}`}
                              className={styles.favoriteCard}
                            >
                              <div className={styles.favoritePoster}>
                                <Image src={poster} alt={favorite.title || 'Favorite'} fill sizes="180px"/>
                                <div className={styles.favoriteOverlay}>
                                  <div className={styles.favoriteTitle}>{favorite.title || 'Untitled'}</div>
                                  <div className={styles.favoriteMeta}>
                                    {favorite.year || '—'} · {favorite.type || 'TV'}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'Overview' || activeTab === 'Favorites' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <h2 className={styles.cardTitle}>Favorite characters</h2>
                      <span className={styles.cardHint}>{favoriteCharacters.length}/10</span>
                    </div>
                    {favoriteCharacters.length === 0 ? (
                      <div className={styles.emptyInline}>
                        Mark a character as favorite to feature them here.
                      </div>
                    ) : (
                      <div className={styles.favoritesGrid}>
                        {favoriteCharacters.map((favorite) => {
                          const poster = favorite.imageUrl || '/logo_no_text.png';
                          return (
                            <Link
                              key={favorite.id}
                              href={`/characters/${favorite.id}`}
                              className={styles.favoriteCard}
                            >
                              <div className={styles.favoritePoster}>
                                <Image src={poster} alt={favorite.name || 'Character'} fill sizes="180px"/>
                                <div className={styles.favoriteOverlay}>
                                  <div className={styles.favoriteTitle}>{favorite.name || '—'}</div>
                                  {favorite.nameKanji ? (
                                    <div className={styles.favoriteMeta}>{favorite.nameKanji}</div>
                                  ) : null}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          </>
        )}
      </div>

      {isEditing ? (
        <div className={styles.modalOverlay} onClick={() => setIsEditing(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHead}>
              <div>
                <div className={styles.modalEyebrow}>SETTINGS</div>
                <h2 className={styles.modalTitle}>Edit profile</h2>
              </div>
              <IconButton icon={X} tooltip="Close" onClick={() => setIsEditing(false)} />
            </div>
            <form className={styles.modalForm} onSubmit={handleSaveProfile}>
              <div className={styles.modalAvatarRow}>
                <div className={styles.modalAvatarCircle}>
                  {editPreview ? (
                    <img src={editPreview} alt="" />
                  ) : avatar ? (
                    <img src={avatar} alt={displayName} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className={styles.modalAvatarStack}>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.modalFile}
                    onChange={(e) => {
                      setEditAvatarFile(e.target.files?.[0] || null);
                      setRemoveAvatar(false);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.modalLinkBtn}
                    onClick={() => {
                      setEditAvatarFile(null);
                      setRemoveAvatar(true);
                    }}
                    disabled={!avatar && !editPreview}
                  >
                    Remove photo
                  </button>
                </div>
              </div>

              <label className={styles.modalLabel}>
                Username
                <input
                  className={styles.modalInput}
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                />
              </label>
              <label className={styles.modalLabel}>
                Bio
                <textarea
                  className={styles.modalTextarea}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                />
              </label>

              {editError ? <div className={styles.modalError}>{editError}</div> : null}

              <div className={styles.modalActions}>
                <Button variant="ghost" size="md" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
