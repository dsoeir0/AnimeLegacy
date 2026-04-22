import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { updateProfile } from 'firebase/auth';
import {
  X,
  Pencil,
  LogOut,
  Star,
  Eye,
  Check,
  Heart,
  PenTool,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { translate } from 'react-switch-lang';
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
import { FAVORITE_LIMIT, MAX_AVATAR_SIZE_BYTES, MAX_AVATAR_SIZE_LABEL } from '../lib/constants';
import styles from './profile.module.css';

const TABS = [
  { id: 'Overview', labelKey: 'profile.tabs.overview' },
  { id: 'Favorites', labelKey: 'profile.tabs.favorites' },
  { id: 'Reviews', labelKey: 'profile.tabs.reviews' },
  { id: 'Activity', labelKey: 'profile.tabs.activity' },
];

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);

const toJsDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const VERB_META = {
  watch: { iconKey: 'watch', labelKey: 'profile.verbs.watched' },
  complete: { iconKey: 'complete', labelKey: 'profile.verbs.completed' },
  rate: { iconKey: 'rate', labelKey: 'profile.verbs.rated' },
  review: { iconKey: 'review', labelKey: 'profile.verbs.reviewed' },
};

const deriveVerb = (entry) => {
  const label = String(entry?.label || '').toLowerCase();
  if (label.includes('review')) return 'review';
  if (label.includes('completed')) return 'complete';
  if (label.includes('rated')) return 'rate';
  return 'watch';
};

const VerbIcon = ({ kind, size = 14 }) => {
  const props = { size, strokeWidth: 2 };
  if (kind === 'complete') return <Check {...props} />;
  if (kind === 'rate') return <Star size={size} fill="currentColor" strokeWidth={0} />;
  if (kind === 'review') return <PenTool {...props} />;
  return <Eye {...props} />;
};

const computeStreak = (activityAll) => {
  if (!Array.isArray(activityAll) || activityAll.length === 0) return 0;
  const days = new Set();
  activityAll.forEach((entry) => {
    const date = toJsDate(entry?.createdAt);
    if (!date) return;
    days.add(dateKey(date));
  });
  if (days.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = dateKey(today);
  const yesterdayKey = dateKey(yesterday);
  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0;
  let streak = 0;
  const cursor = new Date(days.has(todayKey) ? today : yesterday);
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const buildStreakDots = (activityAll) => {
  const days = new Set();
  activityAll.forEach((entry) => {
    const date = toJsDate(entry?.createdAt);
    if (!date) return;
    days.add(dateKey(date));
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dots = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    dots.push({ key, active: days.has(key), today: i === 0 });
  }
  return dots;
};

const groupActivityByDay = (activityAll) => {
  const groups = new Map();
  activityAll.forEach((entry) => {
    const date = toJsDate(entry?.createdAt);
    if (!date) return;
    const key = dateKey(date);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        day: String(date.getDate()).padStart(2, '0'),
        mo: MONTH_ABBR[date.getMonth()],
        items: [],
      });
    }
    groups.get(key).items.push(entry);
  });
  return Array.from(groups.values());
};

const computeGenreBars = (animeItems) => {
  if (!Array.isArray(animeItems)) return [];
  const tally = new Map();
  animeItems.forEach((item) => {
    const progress = Number(item?.progress ?? 0);
    if (!(progress > 0) && item?.status !== 'completed') return;
    if (!Array.isArray(item?.genres)) return;
    item.genres.forEach((genre) => {
      const key = String(genre);
      tally.set(key, (tally.get(key) || 0) + 1);
    });
  });
  const ranked = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = ranked.length ? ranked[0][1] : 1;
  return ranked.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }));
};

function ProfilePage({ t }) {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const router = useRouter();
  const {
    stats,
    favorites,
    favoriteCharacters,
    activityAll,
    profile,
    animeItems,
    loading: profileLoading,
  } = useProfileData(user?.uid);
  const displayName = profile?.username || user?.displayName || 'Guest';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL;
  const initials = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);
  const bio = profile?.bio || t('profile.bioDefault');
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

  const watchingCount = useMemo(
    () =>
      (animeItems || []).filter((item) => normalizeSeasonStatus(item) === 'watching').length,
    [animeItems],
  );

  const airingNow = useMemo(
    () =>
      (animeItems || []).filter(
        (item) => isAiringAnime(item) && normalizeSeasonStatus(item) === 'watching',
      ).length,
    [animeItems],
  );

  const hoursWatched = useMemo(
    () => Math.round((stats.daysSpent || 0) * 24),
    [stats.daysSpent],
  );

  const ratedCount = useMemo(
    () => (animeItems || []).filter((item) => typeof item?.rating === 'number').length,
    [animeItems],
  );

  const streak = useMemo(() => computeStreak(activityAll), [activityAll]);
  const streakDots = useMemo(() => buildStreakDots(activityAll), [activityAll]);

  const genreBars = useMemo(() => computeGenreBars(animeItems), [animeItems]);

  const activityGroups = useMemo(() => groupActivityByDay(activityAll), [activityAll]);
  const recentActivityGroups = useMemo(() => activityGroups.slice(0, 4), [activityGroups]);

  const joinYear = useMemo(() => {
    const candidate =
      profile?.createdAt ||
      profile?.joinedAt ||
      user?.metadata?.creationTime ||
      null;
    const date = toJsDate(candidate);
    return date ? date.getFullYear() : null;
  }, [profile?.createdAt, profile?.joinedAt, user?.metadata?.creationTime]);

  const totalListEntries = (animeItems || []).length;

  const seasonDash = 2 * Math.PI * 34;
  const seasonOffset = seasonDash * (1 - seasonalProgress / 100);

  const editPreview = useMemo(() => {
    if (!editAvatarFile) return '';
    return URL.createObjectURL(editAvatarFile);
  }, [editAvatarFile]);

  useEffect(() => () => editPreview && URL.revokeObjectURL(editPreview), [editPreview]);

  const kpiCards = useMemo(
    () => [
      {
        key: 'completed',
        label: t('profile.kpi.completed'),
        value: stats.watchedCount ?? 0,
        sub: t('profile.kpi.sub.completed'),
        tone: 'primary',
      },
      {
        key: 'watching',
        label: t('profile.kpi.watching'),
        value: watchingCount,
        sub:
          airingNow > 0
            ? t('profile.kpi.sub.airingNow', { n: airingNow })
            : t('profile.kpi.sub.noAiring'),
        tone: 'primary',
      },
      {
        key: 'hours',
        label: t('profile.kpi.hours'),
        value: hoursWatched.toLocaleString(),
        sub: t('profile.kpi.sub.hours'),
        tone: 'warm',
      },
      {
        key: 'episodes',
        label: t('profile.kpi.episodes'),
        value: (stats.totalEpisodes ?? 0).toLocaleString(),
        sub: t('profile.kpi.sub.episodes'),
        tone: 'primary',
      },
      {
        key: 'meanScore',
        label: t('profile.kpi.meanScore'),
        value: stats.myAvgScore ? stats.myAvgScore.toFixed(1) : '—',
        sub: t('profile.kpi.sub.meanScore', { n: ratedCount }),
        tone: 'warm',
      },
      {
        key: 'streak',
        label: t('profile.kpi.streak'),
        value: (
          <>
            {streak}
            <span className={styles.kpiUnit}>{t('profile.kpi.sub.streakUnit')}</span>
          </>
        ),
        sub: streak > 0 ? t('profile.kpi.sub.streakOn') : t('profile.kpi.sub.streakOff'),
        tone: 'green',
      },
    ],
    [t, stats.watchedCount, watchingCount, airingNow, hoursWatched, stats.totalEpisodes, stats.myAvgScore, ratedCount, streak],
  );

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
      setEditError(t('errors.usernameRequired'));
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
          setEditError(t('errors.usernameTaken'));
          setSaving(false);
          return;
        }
      }
      let resolvedAvatar = current?.avatarData || '';
      if (removeAvatar) resolvedAvatar = '';
      if (editAvatarFile) {
        if (editAvatarFile.size > MAX_AVATAR_SIZE_BYTES) {
          setEditError(t('errors.avatarTooBig', { size: MAX_AVATAR_SIZE_LABEL }));
          setSaving(false);
          return;
        }
        const reader = new FileReader();
        resolvedAvatar = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(t('errors.avatarReadFailed')));
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
      setEditError(err?.message || t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const renderActivityItem = (entry, i) => {
    const kind = deriveVerb(entry);
    const verb = VERB_META[kind];
    const posterUrl = entry.posterUrl || '/logo_no_text.png';
    const animeId = entry.animeId;
    const label = entry.label || entry.type || t(verb.labelKey);
    const inner = (
      <>
        <div className={`${styles.activityVerb} ${styles[`verb_${kind}`]}`}>
          <VerbIcon kind={kind} size={14} />
        </div>
        <div className={styles.activityPoster}>
          <Image src={posterUrl} alt={entry.title || 'Activity'} width={48} height={68} />
        </div>
        <div className={styles.activityText}>
          <div className={styles.activityTitle}>{entry.title || 'Activity'}</div>
          <div className={styles.activityDesc}>{label}</div>
        </div>
        <div className={styles.activityTime}>
          {formatRelativeTime(entry.createdAt) || ''}
        </div>
      </>
    );
    const key = `${animeId || 'act'}-${i}`;
    return animeId ? (
      <Link key={key} href={`/anime/${animeId}`} className={styles.activityItem}>
        {inner}
      </Link>
    ) : (
      <div key={key} className={styles.activityItem}>
        {inner}
      </div>
    );
  };

  const renderActivityGroups = (groups) => {
    if (!groups.length) {
      return <div className={styles.emptyInline}>{t('profile.activityEmpty')}</div>;
    }
    return (
      <div className={styles.activityList}>
        {groups.map((group) => (
          <div key={group.key} className={styles.activityDay}>
            <div className={styles.dayLabel}>
              {group.mo}
              <span className={styles.dayDate}>{group.day}</span>
            </div>
            <div className={styles.activityItems}>
              {group.items.map((entry, i) => renderActivityItem(entry, i))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFavoritesGrid = (list, limit) => {
    const slice = typeof limit === 'number' ? list.slice(0, limit) : list;
    if (!slice.length) {
      return <div className={styles.emptyInline}>{t('profile.favoritesEmpty')}</div>;
    }
    return (
      <div className={styles.favStrip}>
        {slice.map((favorite, idx) => {
          const favoriteId = favorite.animeId || favorite.id;
          const poster = favorite.posterUrl || favorite.image || '/logo_no_text.png';
          return (
            <Link key={favoriteId} href={`/anime/${favoriteId}`} className={styles.favCard}>
              <div className={styles.favPoster}>
                <Image src={poster} alt={favorite.title || 'Favorite'} fill sizes="200px" />
                <span className={styles.favRank}>{String(idx + 1).padStart(2, '0')}</span>
                <span className={styles.favHeart}>
                  <Heart size={14} fill="currentColor" strokeWidth={0} />
                </span>
              </div>
              <div className={styles.favMeta}>
                <div className={styles.favTitle}>{favorite.title || 'Untitled'}</div>
                <div className={styles.favSub}>
                  {(favorite.year || '—')} · {(favorite.type || 'TV').toUpperCase()}
                </div>
                {typeof favorite.malScore === 'number' ? (
                  <div className={styles.favScore}>
                    <Star size={11} fill="currentColor" strokeWidth={0} />
                    {favorite.malScore.toFixed(1)}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const renderReviewCard = (entry) => {
    const targetId = entry.animeId || entry.id;
    const poster = entry.posterUrl || entry.image || entry.coverImage || '/logo_no_text.png';
    const rating = typeof entry.rating === 'number' ? entry.rating : null;
    const scoreCls =
      rating === null
        ? styles.reviewScoreMid
        : rating >= 4
          ? ''
          : rating === 3
            ? styles.reviewScoreMid
            : styles.reviewScoreLow;
    return (
      <Link key={targetId} href={`/anime/${targetId}`} className={styles.reviewCard}>
        <div className={styles.reviewPoster}>
          <Image src={poster} alt={entry.title || 'Anime'} width={64} height={92} />
        </div>
        <div className={styles.reviewBody}>
          <div className={styles.reviewHead}>
            <span className={styles.reviewTitle}>{entry.title || 'Untitled'}</span>
            {rating !== null ? (
              <span className={styles.reviewSub}>
                {t('profile.ratingFraction', { n: rating })}
              </span>
            ) : null}
          </div>
          {entry.review ? (
            <p className={styles.reviewExcerpt}>{entry.review}</p>
          ) : (
            <p className={styles.reviewExcerptMuted}>{t('profile.noRatingReview')}</p>
          )}
          <div className={styles.reviewFooter}>
            {entry.updatedAt ? (
              <span>{formatRelativeTime(entry.updatedAt)}</span>
            ) : null}
          </div>
        </div>
        <div className={`${styles.reviewScore} ${scoreCls}`}>
          {rating !== null ? rating.toFixed(1) : '—'}
        </div>
      </Link>
    );
  };

  return (
    <Layout title={t('profile.metaTitle')} description={t('profile.metaDesc')}>
      <div className={styles.page}>
        {!user ? (
          <div className={styles.empty}>
            <h2>{t('myList.redirecting')}</h2>
            <p>{t('myList.loginPrompt')}</p>
          </div>
        ) : (
          <>
            <section className={styles.strip}>
              <div className={styles.stripAvatar}>
                {avatar ? (
                  <img src={avatar} alt={displayName} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className={styles.stripIdent}>
                <div className={styles.stripNameRow}>
                  <h1 className={styles.stripName}>{displayName}</h1>
                  <span className={styles.stripTier}>{t('profile.eyebrow')}</span>
                </div>
                <div className={styles.stripMeta}>
                  {profile?.username ? `@${profile.username}` : user.email}
                  {joinYear ? ` · ${t('profile.joinedYear', { year: joinYear })}` : ''}
                  {reviews.length > 0
                    ? ` · ${t('profile.reviewsCount', { n: reviews.length })}`
                    : ''}
                  {totalListEntries > 0
                    ? ` · ${t('profile.entriesCount', { n: totalListEntries })}`
                    : ''}
                </div>
                {bio ? <p className={styles.stripBio}>{bio}</p> : null}
              </div>
              <div className={styles.stripActions}>
                <Button
                  variant="secondary"
                  size="md"
                  icon={Pencil}
                  onClick={() => setIsEditing(true)}
                >
                  {t('actions.editProfile')}
                </Button>
                <Button variant="ghost" size="md" icon={LogOut} onClick={signOutUser}>
                  {t('actions.signOut')}
                </Button>
              </div>
            </section>

            <section className={styles.kpiRow}>
              {profileLoading
                ? kpiCards.map((k) => (
                    <div key={k.key} className={`${styles.kpi} ${styles[`kpi_${k.tone}`]}`}>
                      <span className={styles.kpiAccent} />
                      <div className={styles.kpiLabel}>{k.label}</div>
                      <Skeleton height={28} width="60%" style={{ margin: '4px 0 10px' }} />
                      <Skeleton height={10} width="40%" />
                    </div>
                  ))
                : kpiCards.map((k) => (
                    <div key={k.key} className={`${styles.kpi} ${styles[`kpi_${k.tone}`]}`}>
                      <span className={styles.kpiAccent} />
                      <div className={styles.kpiLabel}>{k.label}</div>
                      <div className={styles.kpiValue}>{k.value}</div>
                      <div className={styles.kpiDelta}>{k.sub}</div>
                    </div>
                  ))}
            </section>

            <div className={styles.layout}>
              <aside className={styles.aside}>
                <div className={styles.asideCard}>
                  <div className={styles.asideEyebrow}>
                    <span>{t('profile.topGenres')}</span>
                    <span className={styles.asideEyebrowMuted}>
                      {t('profile.allTime')}
                    </span>
                  </div>
                  {genreBars.length === 0 ? (
                    <span className={styles.genreEmpty}>{t('profile.noGenres')}</span>
                  ) : (
                    <div className={styles.genreBars}>
                      {genreBars.map((g) => (
                        <div key={g.name} className={styles.genreBar}>
                          <span className={styles.genreName}>{g.name}</span>
                          <span className={styles.genreCount}>{g.count}</span>
                          <span className={styles.genreTrack}>
                            <span className={styles.genreFill} style={{ width: `${g.pct}%` }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.asideCard}>
                  <div className={styles.asideEyebrow}>
                    <span>
                      {t('profile.seasonTitleProgress', {
                        season: seasonLabel || 'Season',
                      })}
                    </span>
                  </div>
                  <div className={styles.ringWrap}>
                    <div className={styles.ring}>
                      <svg viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--al-ink-4)" strokeWidth="6" />
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          fill="none"
                          stroke="url(#al-ring-grad)"
                          strokeWidth="6"
                          strokeDasharray={seasonDash}
                          strokeDashoffset={seasonOffset}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="al-ring-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="var(--al-primary-1)" />
                            <stop offset="1" stopColor="var(--al-primary-2)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className={styles.ringPct}>{seasonalProgress}%</div>
                    </div>
                    <div className={styles.ringText}>
                      <div className={styles.ringN}>
                        {t('profile.seasonTracked', {
                          done: seasonalCompleted.length,
                          total: seasonalPlanned.length,
                        })}
                      </div>
                      <div className={styles.ringHint}>
                        {t('profile.seasonHintBody', { n: seasonalPlanned.length })}
                      </div>
                    </div>
                  </div>
                  <Link href="/my-list" className={styles.seasonLink}>
                    <Button variant="ghost" size="sm" fullWidth>
                      {t('actions.openMyList')}
                    </Button>
                  </Link>
                </div>

                <div className={styles.asideCard}>
                  <div className={styles.asideEyebrow}>
                    <span>{t('profile.streakTitle')}</span>
                    <span className={styles.asideEyebrowMuted}>
                      <Flame size={12} />
                    </span>
                  </div>
                  <div className={styles.streakNum}>
                    {streak}
                    <span className={styles.streakUnit}>{t('profile.streakUnit')}</span>
                  </div>
                  <div className={styles.streakHint}>
                    {streak > 0
                      ? t('profile.streakBody', { next: Math.max(streak + 7, 7) })
                      : t('profile.streakBodyNone')}
                  </div>
                  <div className={styles.streakDots}>
                    {streakDots.map((dot) => (
                      <span
                        key={dot.key}
                        className={`${styles.streakDot} ${dot.today ? styles.streakDotToday : dot.active ? styles.streakDotOn : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </aside>

              <section className={styles.content}>
                <div className={styles.tabs} role="tablist">
                  {TABS.map((tab) => {
                    const count =
                      tab.id === 'Favorites'
                        ? favorites.length
                        : tab.id === 'Reviews'
                          ? reviews.length
                          : null;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        className={`${styles.tab} ${tab.id === activeTab ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {t(tab.labelKey)}
                        {count !== null ? (
                          <span className={styles.tabCount}>{count}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.contentBody}>
                  {activeTab === 'Overview' ? (
                    <>
                      <div className={styles.section}>
                        <div className={styles.sectionHead}>
                          <div className={styles.titleGroup}>
                            <h3 className={styles.sectionTitle}>{t('profile.recentActivity')}</h3>
                            <span className={styles.kicker}>{t('profile.lastDaysKicker')}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.sectionLink}
                            onClick={() => setActiveTab('Activity')}
                          >
                            {t('profile.seeAll')} <ArrowRight size={14} />
                          </button>
                        </div>
                        {profileLoading ? (
                          <div className={styles.activityList}>
                            {Array.from({ length: 3 }, (_, i) => (
                              <div key={i} className={styles.activityItem}>
                                <div className={styles.activityVerb}>
                                  <Skeleton width={28} height={28} rounded={8} />
                                </div>
                                <div className={styles.activityPoster}>
                                  <Skeleton width={48} height={68} rounded={6} />
                                </div>
                                <div className={styles.activityText}>
                                  <SkeletonText lines={2} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          renderActivityGroups(recentActivityGroups)
                        )}
                      </div>

                      <div className={styles.section}>
                        <div className={styles.sectionHead}>
                          <div className={styles.titleGroup}>
                            <h3 className={styles.sectionTitle}>{t('profile.favoritesTitle')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesRankedKicker', {
                                n: favorites.length,
                                limit: FAVORITE_LIMIT,
                              })}
                            </span>
                          </div>
                          {favorites.length > 0 ? (
                            <button
                              type="button"
                              className={styles.sectionLink}
                              onClick={() => setActiveTab('Favorites')}
                            >
                              {t('profile.seeAll')} <ArrowRight size={14} />
                            </button>
                          ) : null}
                        </div>
                        {renderFavoritesGrid(favorites, 6)}
                      </div>

                      <div className={styles.section}>
                        <div className={styles.sectionHead}>
                          <div className={styles.titleGroup}>
                            <h3 className={styles.sectionTitle}>{t('profile.latestReviews')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.reviewsWritten', { n: reviews.length })}
                            </span>
                          </div>
                          {reviews.length > 0 ? (
                            <button
                              type="button"
                              className={styles.sectionLink}
                              onClick={() => setActiveTab('Reviews')}
                            >
                              {t('profile.allReviewsLink')} <ArrowRight size={14} />
                            </button>
                          ) : null}
                        </div>
                        {reviews.length === 0 ? (
                          <div className={styles.emptyInline}>{t('profile.reviewsEmpty')}</div>
                        ) : (
                          <div className={styles.reviewsList}>
                            {reviews.slice(0, 2).map(renderReviewCard)}
                          </div>
                        )}
                      </div>

                      {favoriteCharacters.length > 0 ? (
                        <div className={styles.section}>
                          <div className={styles.sectionHead}>
                            <div className={styles.titleGroup}>
                              <h3 className={styles.sectionTitle}>
                                {t('profile.favoriteCharactersTitle')}
                              </h3>
                              <span className={styles.kicker}>
                                {t('profile.favoritesCount', {
                                  n: favoriteCharacters.length,
                                  limit: FAVORITE_LIMIT,
                                })}
                              </span>
                            </div>
                          </div>
                          <div className={styles.favStrip}>
                            {favoriteCharacters.slice(0, 6).map((favorite, idx) => (
                              <Link
                                key={favorite.id}
                                href={`/characters/${favorite.id}`}
                                className={styles.favCard}
                              >
                                <div className={styles.favPoster}>
                                  <Image
                                    src={favorite.imageUrl || '/logo_no_text.png'}
                                    alt={favorite.name || 'Character'}
                                    fill
                                    sizes="200px"
                                  />
                                  <span className={styles.favRank}>
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                </div>
                                <div className={styles.favMeta}>
                                  <div className={styles.favTitle}>{favorite.name || '—'}</div>
                                  {favorite.nameKanji ? (
                                    <div className={styles.favSub}>{favorite.nameKanji}</div>
                                  ) : null}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {activeTab === 'Favorites' ? (
                    <>
                      <div className={styles.section}>
                        <div className={styles.sectionHead}>
                          <div className={styles.titleGroup}>
                            <h3 className={styles.sectionTitle}>{t('profile.favoritesTitle')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesCount', {
                                n: favorites.length,
                                limit: FAVORITE_LIMIT,
                              })}
                            </span>
                          </div>
                        </div>
                        {renderFavoritesGrid(favorites)}
                      </div>

                      <div className={styles.section}>
                        <div className={styles.sectionHead}>
                          <div className={styles.titleGroup}>
                            <h3 className={styles.sectionTitle}>
                              {t('profile.favoriteCharactersTitle')}
                            </h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesCount', {
                                n: favoriteCharacters.length,
                                limit: FAVORITE_LIMIT,
                              })}
                            </span>
                          </div>
                        </div>
                        {favoriteCharacters.length === 0 ? (
                          <div className={styles.emptyInline}>
                            {t('profile.favoriteCharactersEmpty')}
                          </div>
                        ) : (
                          <div className={styles.favStrip}>
                            {favoriteCharacters.map((favorite, idx) => (
                              <Link
                                key={favorite.id}
                                href={`/characters/${favorite.id}`}
                                className={styles.favCard}
                              >
                                <div className={styles.favPoster}>
                                  <Image
                                    src={favorite.imageUrl || '/logo_no_text.png'}
                                    alt={favorite.name || 'Character'}
                                    fill
                                    sizes="200px"
                                  />
                                  <span className={styles.favRank}>
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                </div>
                                <div className={styles.favMeta}>
                                  <div className={styles.favTitle}>{favorite.name || '—'}</div>
                                  {favorite.nameKanji ? (
                                    <div className={styles.favSub}>{favorite.nameKanji}</div>
                                  ) : null}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}

                  {activeTab === 'Reviews' ? (
                    <div className={styles.section}>
                      <div className={styles.sectionHead}>
                        <div className={styles.titleGroup}>
                          <h3 className={styles.sectionTitle}>{t('profile.reviewsTitle')}</h3>
                          <span className={styles.kicker}>
                            {t('profile.reviewsWritten', { n: reviews.length })}
                          </span>
                        </div>
                      </div>
                      {reviews.length === 0 ? (
                        <div className={styles.emptyInline}>{t('profile.reviewsEmpty')}</div>
                      ) : (
                        <div className={styles.reviewsList}>{reviews.map(renderReviewCard)}</div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'Activity' ? (
                    <div className={styles.section}>
                      <div className={styles.sectionHead}>
                        <div className={styles.titleGroup}>
                          <h3 className={styles.sectionTitle}>{t('profile.allActivity')}</h3>
                          <span className={styles.kicker}>
                            {t('profile.activityGroupedBy', { n: activityAll.length })}
                          </span>
                        </div>
                      </div>
                      {renderActivityGroups(activityGroups)}
                    </div>
                  ) : null}
                </div>
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
                <div className={styles.modalEyebrow}>{t('profile.modalSettings')}</div>
                <h2 className={styles.modalTitle}>{t('profile.modalTitle')}</h2>
              </div>
              <IconButton icon={X} tooltip={t('actions.close')} onClick={() => setIsEditing(false)} />
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
                    {t('actions.removePhoto')}
                  </button>
                </div>
              </div>

              <label className={styles.modalLabel}>
                {t('forms.username')}
                <input
                  className={styles.modalInput}
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                />
              </label>
              <label className={styles.modalLabel}>
                {t('forms.bio')}
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
                  {t('actions.cancel')}
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={saving}>
                  {saving ? t('actions.saving') : t('actions.saveChanges')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

export default translate(ProfilePage);
