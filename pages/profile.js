import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import ActivityTimeline from '../components/profile/ActivityTimeline';
import EditProfileModal from '../components/profile/EditProfileModal';
import FavoriteCharactersStrip from '../components/profile/FavoriteCharactersStrip';
import FavoriteStudiosStrip from '../components/profile/FavoriteStudiosStrip';
import FavoriteVoicesStrip from '../components/profile/FavoriteVoicesStrip';
import FavoritesStrip from '../components/profile/FavoritesStrip';
import GenreBars from '../components/profile/GenreBars';
import KpiRow from '../components/profile/KpiRow';
import MobileProfileHeader from '../components/profile/MobileProfileHeader';
import ProfileEmptyState from '../components/profile/ProfileEmptyState';
import ProfileHeader from '../components/profile/ProfileHeader';
import RatingDistribution from '../components/profile/RatingDistribution';
import RecentEntriesTable from '../components/profile/RecentEntriesTable';
import ReviewsPanel from '../components/profile/ReviewsPanel';
import SeasonRing from '../components/profile/SeasonRing';
import StreakCard from '../components/profile/StreakCard';
import TopFavoritesCards from '../components/profile/TopFavoritesCards';
import WatchHeatmap from '../components/profile/WatchHeatmap';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { FAVORITE_LIMIT } from '../lib/constants';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { setCharacterFavoritesOrder } from '../lib/services/favoriteCharacters';
import { setStudioFavoritesOrder } from '../lib/services/favoriteStudios';
import { setVoiceFavoritesOrder } from '../lib/services/favoriteVoices';
import { setFavoritesOrder } from '../lib/services/userAnime';
import { isAiringAnime } from '../lib/utils/anime';
import { buildHeatmap } from '../lib/utils/heatmap';
import { debounce } from '../lib/utils/debounce';
import { resolveStatus } from '../lib/utils/listTransitions';
import {
  buildStreakDots,
  computeGenreBars,
  computeStreak,
  groupActivityByDay,
  toJsDate,
} from '../lib/utils/profileActivity';
import {
  computeMeanScoreWithSigma,
  computeRatingHistogram,
  computeRecentEntries,
  countCompletedInDays,
} from '../lib/utils/profileStats';
import { formatSeasonLabel, getSeasonFromDate } from '../lib/utils/season';
import { userInitials } from '../lib/utils/userDisplay';
import styles from '../components/profile/profile.module.css';

const TABS = [
  { id: 'Overview', labelKey: 'profile.tabs.overview' },
  { id: 'Stats', labelKey: 'profile.tabs.stats' },
  { id: 'Reviews', labelKey: 'profile.tabs.reviews' },
  { id: 'Favorites', labelKey: 'profile.tabs.favorites' },
  { id: 'Activity', labelKey: 'profile.tabs.activity' },
];

const normalizeSeasonStatus = (item) =>
  resolveStatus(item?.status, isAiringAnime(item));

function ProfilePage({ t }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    stats,
    favorites,
    favoriteCharacters,
    favoriteVoices,
    favoriteStudios,
    activityAll,
    profile,
    animeItems,
    loading: profileLoading,
  } = useProfileData(user?.uid);

  const displayName = profile?.username || user?.displayName || 'Guest';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL;
  const initials = useMemo(() => userInitials(displayName), [displayName]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [mountedTabs, setMountedTabs] = useState({ Overview: true });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setMountedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  const currentSeason = getSeasonFromDate();
  const currentYear = new Date().getFullYear();
  const seasonLabel = formatSeasonLabel(currentSeason, currentYear);

  const listEntries = (animeItems || []).length;
  const handle = profile?.usernameLower || profile?.username?.toLowerCase() || null;

  const joinYear = useMemo(() => {
    const candidate =
      profile?.createdAt || profile?.joinedAt || user?.metadata?.creationTime || null;
    const date = toJsDate(candidate);
    return date ? date.getFullYear() : null;
  }, [profile?.createdAt, profile?.joinedAt, user?.metadata?.creationTime]);

  const weeksActive = useMemo(() => {
    const candidate =
      profile?.createdAt || profile?.joinedAt || user?.metadata?.creationTime || null;
    const date = toJsDate(candidate);
    if (!date) return 1;
    const diffMs = Date.now() - date.getTime();
    return Math.max(1, Math.round(diffMs / (7 * 86400000)));
  }, [profile?.createdAt, profile?.joinedAt, user?.metadata?.creationTime]);

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

  const writtenReviews = useMemo(
    () =>
      (animeItems || []).filter(
        (item) => typeof item?.review === 'string' && item.review.trim().length > 0,
      ),
    [animeItems],
  );
  const streak = useMemo(() => computeStreak(activityAll), [activityAll]);
  const streakDots = useMemo(() => buildStreakDots(activityAll), [activityAll]);
  const genreBars = useMemo(() => computeGenreBars(animeItems), [animeItems]);
  const activityGroups = useMemo(() => groupActivityByDay(activityAll), [activityAll]);

  const meanWithSigma = useMemo(() => computeMeanScoreWithSigma(animeItems), [animeItems]);
  const completedDelta30d = useMemo(
    () => countCompletedInDays(animeItems, 30),
    [animeItems],
  );
  const ratingHistogram = useMemo(() => computeRatingHistogram(animeItems), [animeItems]);
  const ratedCount = useMemo(
    () => ratingHistogram.reduce((sum, b) => sum + b.count, 0),
    [ratingHistogram],
  );
  const peakRating = useMemo(() => {
    let peak = 0;
    let max = 0;
    for (const b of ratingHistogram) {
      if (b.count > max) {
        max = b.count;
        peak = b.score;
      }
    }
    return peak;
  }, [ratingHistogram]);

  const recentEntries = useMemo(() => computeRecentEntries(animeItems, 6), [animeItems]);

  const activityTimestamps = useMemo(
    () => (activityAll || []).map((entry) => entry?.createdAt),
    [activityAll],
  );
  const activityHeatmap = useMemo(() => buildHeatmap(activityTimestamps), [activityTimestamps]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/sign-in');
  }, [authLoading, router, user]);

  const handleReorderFavorites = useMemo(
    () =>
      debounce((orderedIds) => {
        if (!user?.uid) return;
        setFavoritesOrder({ uid: user.uid, orderedIds }).catch(() => {});
      }, 400),
    [user?.uid],
  );
  const handleReorderCharacters = useMemo(
    () =>
      debounce((orderedIds) => {
        if (!user?.uid) return;
        setCharacterFavoritesOrder({ uid: user.uid, orderedIds }).catch(() => {});
      }, 400),
    [user?.uid],
  );
  const handleReorderVoices = useMemo(
    () =>
      debounce((orderedIds) => {
        if (!user?.uid) return;
        setVoiceFavoritesOrder({ uid: user.uid, orderedIds }).catch(() => {});
      }, 400),
    [user?.uid],
  );
  const handleReorderStudios = useMemo(
    () =>
      debounce((orderedIds) => {
        if (!user?.uid) return;
        setStudioFavoritesOrder({ uid: user.uid, orderedIds }).catch(() => {});
      }, 400),
    [user?.uid],
  );

  const [aniListMap, setAniListMap] = useState({});
  const favoriteIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          favorites.map((fav) => String(fav.animeId || fav.id || '')).filter(Boolean),
        ),
      )
        .sort()
        .join('|'),
    [favorites],
  );
  useEffect(() => {
    if (!favoriteIdsKey) return undefined;
    const ids = favoriteIdsKey.split('|');
    let cancelled = false;
    fetchAniListMediaByMalIds(ids)
      .then((map) => {
        if (!cancelled) setAniListMap(map || {});
        return null;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [favoriteIdsKey]);

  return (
    <Layout title={t('profile.metaTitle')} description={t('profile.metaDesc')} mobileTitle={t('nav.profile')}>
      {user ? (
        <MobileProfileHeader
          avatar={avatar}
          initials={initials}
          displayName={displayName}
          handle={handle}
          joinYear={joinYear}
          bio={profile?.bio}
          stats={stats}
          reviewsCount={writtenReviews.length}
          mean={meanWithSigma.mean}
          onEdit={() => setIsEditing(true)}
        />
      ) : null}
      <div className={styles.page}>
        {!user ? (
          <div className={styles.empty}>
            <h2>{t('myList.redirecting')}</h2>
            <p>{t('myList.loginPrompt')}</p>
          </div>
        ) : (
          <>
            <ProfileHeader
              avatar={avatar}
              initials={initials}
              displayName={displayName}
              handle={handle}
              joinYear={joinYear}
              reviewsCount={writtenReviews.length}
              listEntries={listEntries}
              bio={profile?.bio}
              onEdit={() => setIsEditing(true)}
            />

            {!profileLoading && listEntries === 0 ? <ProfileEmptyState /> : null}

            <KpiRow
              animeItems={animeItems}
              stats={stats}
              completedDelta30d={completedDelta30d}
              mean={meanWithSigma}
              weeksActive={weeksActive}
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
                <div
                  className={styles.tabs}
                  role="tablist"
                  aria-label={t('profile.tabsAriaLabel')}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                    event.preventDefault();
                    const idx = TABS.findIndex((tab) => tab.id === activeTab);
                    const dir = event.key === 'ArrowRight' ? 1 : -1;
                    const nextIdx = (idx + dir + TABS.length) % TABS.length;
                    const nextTab = TABS[nextIdx];
                    setActiveTab(nextTab.id);
                    const el = document.getElementById(`profile-tab-${nextTab.id}`);
                    if (el) el.focus();
                  }}
                >
                  {TABS.map((tab) => {
                    const isActive = tab.id === activeTab;
                    const count =
                      tab.id === 'Favorites'
                        ? favorites.length
                        : tab.id === 'Reviews'
                          ? writtenReviews.length
                          : null;
                    return (
                      <button
                        key={tab.id}
                        id={`profile-tab-${tab.id}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`profile-panel-${tab.id}`}
                        tabIndex={isActive ? 0 : -1}
                        className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
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

                <div
                  className={styles.contentBody}
                  role="tabpanel"
                  id={`profile-panel-${activeTab}`}
                  aria-labelledby={`profile-tab-${activeTab}`}
                  tabIndex={0}
                >
                  <div hidden={activeTab !== 'Overview'}>
                    {mountedTabs.Overview ? (
                      <>
                        <RecentEntriesTable
                          entries={recentEntries}
                          total={listEntries}
                          onSeeAll={() => router.push('/my-list')}
                        />
                        <TopFavoritesCards
                          favorites={favorites}
                          aniListMap={aniListMap}
                          onReorder={handleReorderFavorites}
                        />
                      </>
                    ) : null}
                  </div>

                  <div hidden={activeTab !== 'Stats'}>
                    {mountedTabs.Stats ? (
                      <>
                        <RatingDistribution
                          histogram={ratingHistogram}
                          rated={ratedCount}
                          peak={peakRating}
                        />
                        <div className={styles.section}>
                          <h3 className={styles.sectionTitle}>{t('profile.genreBreakdown')}</h3>
                          <GenreBars bars={genreBars} />
                        </div>
                        <WatchHeatmap
                          heatmap={activityHeatmap}
                          title={t('profile.activityHeatmap')}
                          meta={t('profile.heatmapMeta')}
                        />
                      </>
                    ) : null}
                  </div>

                  <div hidden={activeTab !== 'Favorites'}>
                    {mountedTabs.Favorites ? (
                      <>
                        <div className={styles.section}>
                          <div className={styles.distroHead}>
                            <h3 className={styles.sectionTitle}>{t('profile.favoritesTitle')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesCount', { n: favorites.length, limit: FAVORITE_LIMIT })}
                            </span>
                          </div>
                          <FavoritesStrip
                            favorites={favorites}
                            aniListMap={aniListMap}
                            onReorder={handleReorderFavorites}
                          />
                        </div>
                        <div className={styles.section}>
                          <div className={styles.distroHead}>
                            <h3 className={styles.sectionTitle}>{t('profile.favoriteCharactersTitle')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesCount', { n: favoriteCharacters.length, limit: FAVORITE_LIMIT })}
                            </span>
                          </div>
                          <FavoriteCharactersStrip
                            favorites={favoriteCharacters}
                            onReorder={handleReorderCharacters}
                          />
                        </div>
                        <div className={styles.section}>
                          <div className={styles.distroHead}>
                            <h3 className={styles.sectionTitle}>{t('profile.favoriteVoicesTitle')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesCount', { n: favoriteVoices.length, limit: FAVORITE_LIMIT })}
                            </span>
                          </div>
                          <FavoriteVoicesStrip
                            favorites={favoriteVoices}
                            onReorder={handleReorderVoices}
                          />
                        </div>
                        <div className={styles.section}>
                          <div className={styles.distroHead}>
                            <h3 className={styles.sectionTitle}>{t('profile.favoriteStudiosTitle')}</h3>
                            <span className={styles.kicker}>
                              {t('profile.favoritesCount', { n: favoriteStudios.length, limit: FAVORITE_LIMIT })}
                            </span>
                          </div>
                          <FavoriteStudiosStrip
                            favorites={favoriteStudios}
                            onReorder={handleReorderStudios}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div hidden={activeTab !== 'Reviews'}>
                    {mountedTabs.Reviews ? (
                      <ReviewsPanel reviews={writtenReviews} joinYear={joinYear} />
                    ) : null}
                  </div>

                  <div hidden={activeTab !== 'Activity'}>
                    {mountedTabs.Activity ? (
                      <ActivityTimeline
                        groups={activityGroups}
                        total={activityAll.length}
                        animeItems={animeItems}
                      />
                    ) : null}
                  </div>
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
