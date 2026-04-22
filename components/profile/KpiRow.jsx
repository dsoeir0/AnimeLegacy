import { useMemo } from 'react';
import { translate } from 'react-switch-lang';
import Skeleton from '../ui/Skeleton';
import { isAiringAnime } from '../../lib/utils/anime';
import styles from './profile.module.css';

// The "watching" status for airing shows is reconstructed from the completed
// flag (we auto-downgrade), so surface both counts here. Kept as the KPI
// owner's responsibility so the profile page doesn't hand-roll stats.
const normalizeWatchingStatus = (item) =>
  isAiringAnime(item) && item?.status === 'completed' ? 'watching' : item?.status;

function KpiRow({ animeItems, stats, streak, loading, t }) {
  const watchingCount = useMemo(
    () =>
      (animeItems || []).filter((item) => normalizeWatchingStatus(item) === 'watching').length,
    [animeItems],
  );
  const airingNow = useMemo(
    () =>
      (animeItems || []).filter(
        (item) => isAiringAnime(item) && normalizeWatchingStatus(item) === 'watching',
      ).length,
    [animeItems],
  );
  const hoursWatched = useMemo(
    () => Math.round((stats?.daysSpent || 0) * 24),
    [stats?.daysSpent],
  );
  const ratedCount = useMemo(
    () => (animeItems || []).filter((item) => typeof item?.rating === 'number').length,
    [animeItems],
  );

  const kpiCards = useMemo(
    () => [
      {
        key: 'completed',
        label: t('profile.kpi.completed'),
        value: stats?.watchedCount ?? 0,
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
        value: (stats?.totalEpisodes ?? 0).toLocaleString(),
        sub: t('profile.kpi.sub.episodes'),
        tone: 'primary',
      },
      {
        key: 'meanScore',
        label: t('profile.kpi.meanScore'),
        value: stats?.myAvgScore ? stats.myAvgScore.toFixed(1) : '—',
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
    [t, stats?.watchedCount, stats?.totalEpisodes, stats?.myAvgScore, watchingCount, airingNow, hoursWatched, ratedCount, streak],
  );

  return (
    <section className={styles.kpiRow}>
      {kpiCards.map((k) => (
        <div key={k.key} className={`${styles.kpi} ${styles[`kpi_${k.tone}`]}`}>
          <span className={styles.kpiAccent} />
          <div className={styles.kpiLabel}>{k.label}</div>
          {loading ? (
            <>
              <Skeleton height={28} width="60%" style={{ margin: '4px 0 10px' }} />
              <Skeleton height={10} width="40%" />
            </>
          ) : (
            <>
              <div className={styles.kpiValue}>{k.value}</div>
              <div className={styles.kpiDelta}>{k.sub}</div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

export default translate(KpiRow);
