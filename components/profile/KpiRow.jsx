import { useMemo } from 'react';
import { translate } from 'react-switch-lang';
import Skeleton from '../ui/Skeleton';
import { isAiringAnime } from '../../lib/utils/anime';
import styles from './profile.module.css';

const normalizeWatchingStatus = (item) =>
  isAiringAnime(item) && item?.status === 'completed' ? 'watching' : item?.status;

function KpiRow({ animeItems, stats, completedDelta30d, mean, weeksActive, loading, t }) {
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
  const epsPerWeek = useMemo(() => {
    const eps = stats?.totalEpisodes || 0;
    const w = Math.max(1, weeksActive || 1);
    return Math.round(eps / w);
  }, [stats?.totalEpisodes, weeksActive]);

  const kpiCards = useMemo(
    () => [
      {
        key: 'completed',
        label: t('profile.kpi.completed'),
        value: (stats?.watchedCount ?? 0).toLocaleString(),
        sub:
          completedDelta30d > 0
            ? t('profile.kpi.sub.completedDelta', { n: completedDelta30d })
            : t('profile.kpi.sub.completed'),
      },
      {
        key: 'watching',
        label: t('profile.kpi.watching'),
        value: watchingCount,
        sub:
          airingNow > 0
            ? t('profile.kpi.sub.airingNow', { n: airingNow })
            : t('profile.kpi.sub.noAiring'),
      },
      {
        key: 'hours',
        label: t('profile.kpi.hours'),
        value: hoursWatched.toLocaleString(),
        sub: t('profile.kpi.sub.hours'),
      },
      {
        key: 'episodes',
        label: t('profile.kpi.episodes'),
        value: (stats?.totalEpisodes ?? 0).toLocaleString(),
        sub:
          epsPerWeek > 0
            ? t('profile.kpi.sub.epsPerWeek', { n: epsPerWeek })
            : t('profile.kpi.sub.episodes'),
      },
      {
        key: 'meanScore',
        label: t('profile.kpi.meanScore'),
        value: mean?.mean !== null && mean?.mean !== undefined ? mean.mean.toFixed(1) : '—',
        sub:
          mean?.mean !== null && mean?.sigma !== null
            ? t('profile.kpi.sub.meanScoreSigma', {
                sigma: mean.sigma.toFixed(1),
                n: mean.count,
              })
            : t('profile.kpi.sub.meanScoreEmpty'),
      },
    ],
    [t, stats, completedDelta30d, mean, watchingCount, airingNow, hoursWatched, epsPerWeek],
  );

  return (
    <section className={styles.kpiRow}>
      {kpiCards.map((k) => (
        <div key={k.key} className={styles.kpi}>
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
