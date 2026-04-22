import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import ActivityGroups from '../components/profile/ActivityGroups';
import EditProfileModal from '../components/profile/EditProfileModal';
import FavoriteCharactersStrip from '../components/profile/FavoriteCharactersStrip';
import FavoritesStrip from '../components/profile/FavoritesStrip';
import GenreBars from '../components/profile/GenreBars';
import KpiRow from '../components/profile/KpiRow';
import ProfileStrip from '../components/profile/ProfileStrip';
import ReviewCard from '../components/profile/ReviewCard';
import SeasonRing from '../components/profile/SeasonRing';
import StreakCard from '../components/profile/StreakCard';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { FAVORITE_LIMIT } from '../lib/constants';
import { isAiringAnime } from '../lib/utils/anime';
import {
  buildStreakDots,
  computeGenreBars,
  computeStreak,
  groupActivityByDay,
  toJsDate,
} from '../lib/utils/profileActivity';
import { formatSeasonLabel, getSeasonFromDate } from '../lib/utils/season';
import styles from '../components/profile/profile.module.css';

const TABS = [
  { id: 'Overview', labelKey: 'profile.tabs.overview' },
  { id: 'Favorites', labelKey: 'profile.tabs.favorites' },
  { id: 'Reviews', labelKey: 'profile.tabs.reviews' },
  { id: 'Activity', labelKey: 'profile.tabs.activity' },
];

const normalizeSeasonStatus = (item) =>
  isAiringAnime(item) && item?.status === 'completed' ? 'watching' : item?.status;

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/sign-in');
  }, [authLoading, router, user]);

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
            <ProfileStrip
              avatar={avatar}
              displayName={displayName}
              initials={initials}
              profile={profile}
              email={user.email}
              joinYear={joinYear}
              reviewsCount={reviews.length}
              listEntries={(animeItems || []).length}
              bio={bio}
              onEdit={() => setIsEditing(true)}
              onSignOut={signOutUser}
            />

            <KpiRow
              animeItems={animeItems}
              stats={stats}
              streak={streak}
              loading={profileLoading}
            />

            <div className={styles.layout}>
              <aside className={styles.aside}>
                <GenreBars bars={genreBars} />
                <SeasonRing
                  seasonLabel={seasonLabel}
                  progress={seasonalProgress}
                  done={seasonalCompleted.length}
                  total={seasonalPlanned.length}
                />
                <StreakCard streak={streak} dots={streakDots} />
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
                        <ActivityGroups
                          groups={recentActivityGroups}
                          loading={profileLoading}
                        />
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
                        <FavoritesStrip favorites={favorites} limit={6} />
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
                            {reviews.slice(0, 2).map((entry) => (
                              <ReviewCard key={entry.animeId || entry.id} entry={entry} />
                            ))}
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
                          <FavoriteCharactersStrip favorites={favoriteCharacters} limit={6} />
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
                        <FavoritesStrip favorites={favorites} />
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
                        <FavoriteCharactersStrip favorites={favoriteCharacters} />
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
                        <div className={styles.reviewsList}>
                          {reviews.map((entry) => (
                            <ReviewCard key={entry.animeId || entry.id} entry={entry} />
                          ))}
                        </div>
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
                      <ActivityGroups groups={activityGroups} />
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {isEditing && user ? (
        <EditProfileModal
          user={user}
          profile={profile}
          avatar={avatar}
          displayName={displayName}
          initials={initials}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </Layout>
  );
}

export default translate(ProfilePage);
