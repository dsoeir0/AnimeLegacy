import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { formatRelativeTime } from '../lib/utils/time';
import { formatSeasonLabel, getSeasonFromDate } from '../lib/utils/season';
import { claimUsername, getUserProfile, upsertUserProfile } from '../lib/services/userProfile';
import { getFirebaseClient } from '../lib/firebase/client';
import { updateProfile } from 'firebase/auth';
import { isAiringAnime } from '../lib/utils/anime';
import styles from '../styles/profile.module.css';

export default function ProfilePage() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const router = useRouter();
  const { stats, genres, favorites, favoriteCharacters, activity, activityAll, profile, animeItems } =
    useProfileData(user?.uid);
  const displayName = profile?.username || user?.displayName || 'Zenith_Runner';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL;
  const initials = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);
  const bio =
    profile?.bio ||
    'Seasonal anime hunter since 2018. If it has Mecha or Cyberpunk, I am there. Currently watching 8 seasonal shows.';
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const currentSeason = getSeasonFromDate();
  const currentYear = new Date().getFullYear();
  const seasonLabel = formatSeasonLabel(currentSeason, currentYear);

  const seasonalItems = useMemo(() => {
    return (animeItems || []).filter(
      (item) => item?.season === currentSeason && item?.year === currentYear,
    );
  }, [animeItems, currentSeason, currentYear]);

  const normalizeSeasonStatus = (item) =>
    isAiringAnime(item) && item?.status === 'completed' ? 'watching' : item?.status;

  const seasonalPlanned = useMemo(
    () =>
      seasonalItems.filter(
        (item) => {
          const status = normalizeSeasonStatus(item);
          return status !== 'dropped' && status !== 'removed';
        },
      ),
    [seasonalItems],
  );
  const seasonalCompleted = useMemo(
    () => seasonalItems.filter((item) => normalizeSeasonStatus(item) === 'completed'),
    [seasonalItems],
  );
  const seasonalProgress = seasonalPlanned.length
    ? Math.round((seasonalCompleted.length / seasonalPlanned.length) * 100)
    : 0;
  const reviews = useMemo(() => {
    return (animeItems || []).filter((item) => {
      const hasRating = typeof item?.rating === 'number';
      const hasReview = Boolean(item?.review && String(item.review).trim().length > 0);
      return hasRating || hasReview;
    });
  }, [animeItems]);
  const withTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
    ]);

  const editPreview = useMemo(() => {
    if (!editAvatarFile) return '';
    return URL.createObjectURL(editAvatarFile);
  }, [editAvatarFile]);

  useEffect(() => {
    return () => {
      if (editPreview) URL.revokeObjectURL(editPreview);
    };
  }, [editPreview]);

  const statCards = [
    { label: 'Watched', value: stats.watchedCount ?? 0, sublabel: 'Anime' },
    { label: 'Episodes', value: stats.totalEpisodes ?? 0, sublabel: 'Total seen' },
    {
      label: 'Days',
      value: stats.daysSpent ? stats.daysSpent.toFixed(1) : '0.0',
      sublabel: 'Time spent',
    },
    {
      label: 'Reviews',
      value: stats.reviewCount ?? 0,
      sublabel: 'Written',
    },
    {
      label: 'Avg MAL Score',
      value: stats.malAvgScore ? stats.malAvgScore.toFixed(1) : '-',
      sublabel: 'MyAnimeList',
    },
    {
      label: 'My Avg Score',
      value: stats.myAvgScore ? stats.myAvgScore.toFixed(1) : '-',
      sublabel: 'Your ratings',
    },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/sign-in');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!isEditing) return;
    setEditUsername(profile?.username || user?.displayName || '');
    setEditBio(profile?.bio || '');
    setEditAvatarFile(null);
    setRemoveAvatar(false);
    setEditError('');
    setDeleteText('');
    setDeleteError('');
  }, [isEditing, profile?.bio, profile?.username, user?.displayName]);

  const orderedFavorites = favorites;
  const orderedFavoriteCharacters = favoriteCharacters;


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
          'Username check'
        );
        if (!claim.ok) {
          setEditError('Username is already taken.');
          setSaving(false);
          return;
        }
      }

      let resolvedAvatar = current?.avatarData || '';
      if (removeAvatar) {
        resolvedAvatar = '';
      }
      if (editAvatarFile) {
        if (editAvatarFile.size > 512 * 1024) {
          setEditError('Avatar must be under 512KB.');
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
        await updateProfile(auth.currentUser, {
          displayName: editUsername.trim(),
          photoURL: null,
        });
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
        'Profile save'
      );
      setIsEditing(false);
    } catch (err) {
      setEditError(err?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid) return;
    if (deleteText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const { auth } = getFirebaseClient();
      if (!auth?.currentUser) {
        setDeleteError('Please sign in again, then retry deleting your account.');
        return;
      }
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error || data?.message || 'Unable to delete account.';
        setDeleteError(message);
        return;
      }

      await signOutUser();
      router.replace('/');
    } catch (err) {
      setDeleteError(err?.message || 'Unable to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - Profile"
      description="Your AnimeLegacy profile and activity overview."
    >
      <main className={styles.main}>
        {!user ? (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Redirecting</div>
            <p className={styles.progressText}>Please log in to view your profile.</p>
          </div>
        ) : (
          <>
            <section className={styles.hero}>
              <div className={styles.heroBackdrop} />
              <div className={styles.heroContent}>
                <div className={styles.avatarWrapper}>
                  {avatar ? (
                    <img className={styles.avatarImage} src={avatar} alt={displayName} />
                  ) : (
                    <span className={styles.avatarInitial}>{initials}</span>
                  )}
                </div>
                <div className={styles.heroMeta}>
                  <div className={styles.heroTitleRow}>
                    <h1 className={styles.heroTitle}>{displayName}</h1>
                  </div>
                  <p className={styles.heroSubtitle}>{bio}</p>
                </div>
                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </section>

            <div className={styles.grid}>
              <aside className={styles.sidebar}>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Profile Stats</div>
                  <div className={styles.statsGrid}>
                    {statCards.map((stat) => (
                      <div key={stat.label} className={styles.statItem}>
                        <div className={styles.statLabel}>{stat.label}</div>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statSub}>{stat.sublabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Most Watched Genres</div>
                  <div className={styles.genreTags}>
                    {genres.length > 0 ? (
                      genres.map((genre) => (
                        <span key={genre} className={styles.genreTag}>
                          {genre}
                        </span>
                      ))
                    ) : (
                      <span className={styles.genreEmpty}>No genre data yet.</span>
                    )}
                  </div>
                </div>
              </aside>

              <section className={styles.content}>
                <div className={styles.tabs}>
                  {['Overview', 'Favorites', 'Reviews', 'Activity'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={tab === activeTab ? styles.tabActive : styles.tab}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'Overview' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>Recent Activity</h2>
                      <span className={styles.cardHint} aria-hidden="true" />
                    </div>
                    <div className={styles.activityList}>
                      {activity.length === 0 ? (
                        <div className={styles.activityItem}>
                          <div className={styles.activityMeta}>
                            <div className={styles.activityTitle}>No activity yet</div>
                            <div className={styles.activitySubtitle}>
                              Add anime to your list to get started.
                            </div>
                          </div>
                        </div>
                      ) : (
                        activity.map((entry, index) => (
                          <div
                            key={`${entry.animeId || 'activity'}-${index}`}
                            className={styles.activityItem}
                          >
                            <div className={styles.activityThumb}>
                              <Image
                                src={entry.posterUrl || '/logo_no_text.png'}
                                alt={entry.title || 'Activity'}
                                width={48}
                                height={64}
                              />
                            </div>
                            <div className={styles.activityMeta}>
                              <div className={styles.activityTitle}>{entry.title || 'Activity'}</div>
                              <div className={styles.activitySubtitle}>
                                {entry.label || entry.type || 'Updated'}
                              </div>
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

                {activeTab === 'Activity' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>All Activity</h2>
                      <span className={styles.cardHint}>
                        {activityAll.length} updates
                      </span>
                    </div>
                    <div className={styles.activityList}>
                      {activityAll.length === 0 ? (
                        <div className={styles.activityItem}>
                          <div className={styles.activityMeta}>
                            <div className={styles.activityTitle}>No activity yet</div>
                            <div className={styles.activitySubtitle}>
                              Add anime to your list to start tracking updates.
                            </div>
                          </div>
                        </div>
                      ) : (
                        activityAll.map((entry, index) => (
                          <div
                            key={`${entry.animeId || 'activity'}-full-${index}`}
                            className={styles.activityItem}
                          >
                            <div className={styles.activityThumb}>
                              <Image
                                src={entry.posterUrl || '/logo_no_text.png'}
                                alt={entry.title || 'Activity'}
                                width={48}
                                height={64}
                              />
                            </div>
                            <div className={styles.activityMeta}>
                              <div className={styles.activityTitle}>{entry.title || 'Activity'}</div>
                              <div className={styles.activitySubtitle}>
                                {entry.label || entry.type || 'Updated'}
                              </div>
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
                    <div className={styles.cardHeader}>
                      <h2>Your Reviews</h2>
                      <span className={styles.cardHint}>{reviews.length} published</span>
                    </div>
                    {reviews.length === 0 ? (
                      <>
                        <p className={styles.progressText}>
                          Share your thoughts on finished shows to build your review shelf.
                        </p>
                        <button className={styles.secondaryButton} type="button">
                          Write your first review
                        </button>
                      </>
                    ) : (
                      <div className={styles.reviewList}>
                        {reviews.map((entry) => {
                          const poster =
                            entry.posterUrl ||
                            entry.image ||
                            entry.coverImage ||
                            '/logo_no_text.png';
                          return (
                            <div key={entry.animeId || entry.id} className={styles.reviewCard}>
                              <div className={styles.reviewPoster}>
                                <Image
                                  src={poster}
                                  alt={entry.title || 'Anime'}
                                  width={72}
                                  height={96}
                                />
                              </div>
                              <div className={styles.reviewMeta}>
                                <div className={styles.reviewTitle}>{entry.title || 'Untitled'}</div>
                                <div className={styles.reviewScore}>
                                  {typeof entry.rating === 'number' ? `${entry.rating}/5` : 'Not rated'}
                                </div>
                                {entry.review ? (
                                  <p className={styles.reviewText}>{entry.review}</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'Overview' || activeTab === 'Favorites' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>All-Time Favorites</h2>
                      <span className={styles.cardHint} aria-hidden="true" />
                    </div>
                    <div className={styles.favoritesGrid}>
                      {favorites.length === 0 ? (
                        <div className={styles.favoriteEmpty}>
                          <Image
                            src="/logo_no_text.png"
                            alt="No favorites yet"
                            width={120}
                            height={160}
                          />
                          <div>
                            <div className={styles.favoriteEmptyTitle}>No favorites yet</div>
                            <div className={styles.favoriteEmptyText}>
                              Mark a completed anime as favorite to feature it here.
                            </div>
                          </div>
                        </div>
                      ) : (
                        orderedFavorites.map((favorite) => {
                          const favoriteId = favorite.animeId || favorite.id;
                          const poster = favorite.posterUrl || favorite.image || '/logo_no_text.png';
                          const favoriteKey = String(favoriteId);
                          return (
                            <Link
                              key={favoriteId}
                              href={`/anime/${favoriteId}`}
                              className={styles.favoriteCard}
                              data-favorite-id={favoriteKey}
                            >
                              <div className={styles.favoritePoster}>
                                <Image
                                  src={poster}
                                  alt={favorite.title || 'Favorite'}
                                  width={200}
                                  height={280}
                                />
                              </div>
                              <div className={styles.favoriteOverlay}>
                                <div className={styles.favoriteTitle}>
                                  {favorite.title || 'Untitled'}
                                </div>
                                <div className={styles.favoriteMeta}>
                                  {favorite.year || '-'} - {favorite.type || 'Series'}
                                </div>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'Overview' || activeTab === 'Favorites' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>Favorite Characters</h2>
                      <span className={styles.cardHint} aria-hidden="true" />
                    </div>
                    <div className={styles.favoritesGrid}>
                      {orderedFavoriteCharacters.length === 0 ? (
                        <div className={styles.favoriteEmpty}>
                          <Image
                            src="/logo_no_text.png"
                            alt="No favorite characters"
                            width={120}
                            height={160}
                          />
                          <div>
                            <div className={styles.favoriteEmptyTitle}>No favorite characters</div>
                            <div className={styles.favoriteEmptyText}>
                              Mark a character as favorite to feature it here.
                            </div>
                          </div>
                        </div>
                      ) : (
                        orderedFavoriteCharacters.map((favorite) => {
                          const favoriteId = favorite.id;
                          const poster = favorite.imageUrl || '/logo_no_text.png';
                          return (
                            <Link
                              key={favoriteId}
                              href={`/characters/${favoriteId}`}
                              className={styles.favoriteCard}
                            >
                              <div className={styles.favoritePoster}>
                                <Image
                                  src={poster}
                                  alt={favorite.name || 'Character'}
                                  width={200}
                                  height={280}
                                />
                              </div>
                              <div className={styles.favoriteOverlay}>
                                <div className={styles.favoriteTitle}>
                                  {favorite.name || 'Unknown Character'}
                                </div>
                                {favorite.nameKanji ? (
                                  <div className={styles.favoriteMeta}>{favorite.nameKanji}</div>
                                ) : null}
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'Overview' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>{seasonLabel} Progress</h2>
                      <div className={styles.progressBadge}>{seasonalProgress}%</div>
                    </div>
                    <p className={styles.progressText}>
                      You have completed {seasonalCompleted.length} of your {seasonalPlanned.length} planned shows
                      this season.
                    </p>
                    <button className={styles.secondaryButton} type="button">
                      Go to Seasonal List
                    </button>
                  </div>
                ) : null}
              </section>
            </div>
          </>
        )}
      </main>
      {isEditing ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Edit profile">
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderRow}>
                <h2>Edit profile</h2>
                <button
                  className={styles.modalClose}
                  type="button"
                  onClick={() => setIsEditing(false)}
                  aria-label="Close"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <p>Update your username, bio, and avatar.</p>
            </div>
            <form className={styles.modalForm} onSubmit={handleSaveProfile}>
              <label className={styles.modalLabel}>
                Username
                <input
                  className={styles.modalInput}
                  type="text"
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                  required
                />
              </label>
              <label className={styles.modalLabel}>
                Bio
                <textarea
                  className={styles.modalTextarea}
                  value={editBio}
                  onChange={(event) => setEditBio(event.target.value)}
                  rows={3}
                />
              </label>
              <div className={styles.modalAvatarRow}>
                <div className={styles.modalAvatarCircle}>
                  {editPreview ? (
                    <img src={editPreview} alt="Avatar preview" />
                  ) : avatar ? (
                    <img src={avatar} alt={displayName} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className={styles.modalFileStack}>
                  <input
                    className={styles.modalFile}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setEditAvatarFile(event.target.files?.[0] || null);
                      setRemoveAvatar(false);
                    }}
                  />
                  <button
                    className={styles.modalRemove}
                    type="button"
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
              {editError ? <div className={styles.modalError}>{editError}</div> : null}
              <div className={styles.modalActions}>
                <button
                  className={styles.modalSecondary}
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button className={styles.modalPrimary} type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
              <div className={styles.dangerZone}>
                <div className={styles.dangerTitle}>Delete account</div>
                <p className={styles.dangerText}>
                  This will permanently remove your profile data. Type DELETE to confirm.
                </p>
                <input
                  className={styles.dangerInput}
                  type="text"
                  value={deleteText}
                  onChange={(event) => setDeleteText(event.target.value)}
                  placeholder="DELETE"
                />
                {deleteError ? <div className={styles.dangerError}>{deleteError}</div> : null}
                <button
                  className={styles.dangerButton}
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
