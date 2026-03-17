import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { formatRelativeTime } from '../lib/utils/time';
import { claimUsername, getUserProfile, upsertUserProfile } from '../lib/services/userProfile';
import { getFirebaseClient } from '../lib/firebase/client';
import { updateProfile } from 'firebase/auth';
import styles from '../styles/profile.module.css';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { stats, genres, favorites, activity, profile } = useProfileData(user?.uid);
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
      label: 'Mean Score',
      value: stats.meanScore ? stats.meanScore.toFixed(1) : '-',
      sublabel: 'Personal avg',
    },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    }
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
                    <span className={styles.heroBadge}>PRO</span>
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
                  <div className={styles.cardTitle}>Genres</div>
                  <div className={styles.genreTags}>
                    {genres.length === 0 ? (
                      <span className={styles.genreTag}>No genres yet</span>
                    ) : (
                      genres.map((genre) => (
                        <span key={genre} className={styles.genreTag}>
                          {genre}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </aside>

              <section className={styles.content}>
                <div className={styles.tabs}>
                  {['Overview', 'Favorites'].map((tab) => (
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
                      <button className={styles.textButton} type="button">
                        View All
                      </button>
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

                {activeTab === 'Overview' || activeTab === 'Favorites' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>All-Time Favorites</h2>
                    </div>
                    <div className={styles.favoritesGrid}>
                      {favorites.length === 0 ? (
                        <div className={styles.favoriteCard}>
                          <Image
                            src="/logo_no_text.png"
                            alt="No favorites yet"
                            width={140}
                            height={190}
                          />
                        </div>
                      ) : (
                        favorites.map((favorite) => (
                          <div key={favorite.animeId || favorite.id} className={styles.favoriteCard}>
                            <Image
                              src={favorite.posterUrl || favorite.image || '/logo_no_text.png'}
                              alt={favorite.title || 'Favorite'}
                              width={140}
                              height={190}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'Overview' ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>Winter 2026 Progress</h2>
                      <div className={styles.progressBadge}>50%</div>
                    </div>
                    <p className={styles.progressText}>
                      You have completed 4 of your 8 planned shows this season. Keep going, the finale
                      of Echoes of Valhalla is just around the corner.
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
              <h2>Edit profile</h2>
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
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
