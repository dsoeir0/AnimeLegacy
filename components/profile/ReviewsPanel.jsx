import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { getLanguage, translate } from 'react-switch-lang';
import RatingDistribution from './RatingDistribution';
import ReviewRow from './ReviewRow';
import {
  SENTIMENT_BUCKETS,
  collectReviewYears,
  computeReviewsStats,
  filterReviewsByText,
  filterReviewsByYear,
  groupReviewsBySentiment,
  sortReviews,
} from '../../lib/utils/reviewsView';
import { computeRatingHistogram } from '../../lib/utils/profileStats';
import styles from './profile.module.css';

const SORT_MODES = ['newest', 'highest', 'lowest', 'longest'];

function ReviewsPanel({ reviews, joinYear, t }) {
  const lang = getLanguage();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('newest');
  const [year, setYear] = useState('all');
  const [collapsed, setCollapsed] = useState({});

  const years = useMemo(() => collectReviewYears(reviews), [reviews]);
  const stats = useMemo(() => computeReviewsStats(reviews), [reviews]);
  const histogram = useMemo(() => computeRatingHistogram(reviews), [reviews]);
  const ratedCount = histogram.reduce((sum, b) => sum + b.count, 0);
  const peakRating = histogram.reduce(
    (peak, b) => (b.count > peak.count ? b : peak),
    { score: 0, count: 0 },
  ).score;

  const filteredReviews = useMemo(() => {
    let list = filterReviewsByText(reviews, query);
    list = filterReviewsByYear(list, year);
    return sortReviews(list, sortMode);
  }, [reviews, query, year, sortMode]);

  const grouped = useMemo(() => groupReviewsBySentiment(filteredReviews), [filteredReviews]);
  const hasAny = SENTIMENT_BUCKETS.some((b) => (grouped[b.key] || []).length > 0);

  if ((reviews || []).length === 0) {
    return <div className={styles.emptyInline}>{t('profile.reviewsEmpty')}</div>;
  }

  return (
    <div className={styles.reviewsPanel}>
      <div className={styles.distroHead}>
        <h3 className={styles.sectionTitle}>{t('profile.reviewsTitle')}</h3>
        <span className={styles.kicker}>
          {t('profile.reviewsMeta', {
            n: stats.total,
            year: joinYear || '—',
          })}
        </span>
      </div>

      <div className={styles.reviewsStatsBanner}>
        <div className={styles.reviewsKpis}>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{t('profile.reviewKpi.published')}</div>
            <div className={styles.kpiValue}>{stats.total.toLocaleString()}</div>
            <div className={styles.kpiDelta}>
              {joinYear
                ? t('profile.reviewKpi.sinceYear', { year: joinYear })
                : t('profile.reviewKpi.allTime')}
            </div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{t('profile.reviewKpi.meanScore')}</div>
            <div className={styles.kpiValue}>
              {stats.mean !== null ? stats.mean.toFixed(1) : '—'}
            </div>
            <div className={styles.kpiDelta}>{t('profile.reviewKpi.ratedCount', { n: ratedCount })}</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{t('profile.reviewKpi.avgLength')}</div>
            <div className={styles.kpiValue}>
              {stats.avgWords > 0 ? stats.avgWords.toLocaleString() : '—'}
              {stats.avgWords > 0 ? <span className={styles.kpiUnit}>w</span> : null}
            </div>
            <div className={styles.kpiDelta}>{t('profile.reviewKpi.wordsAvg')}</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{t('profile.reviewKpi.totalWords')}</div>
            <div className={styles.kpiValue}>{stats.totalWords.toLocaleString()}</div>
            <div className={styles.kpiDelta}>{t('profile.reviewKpi.totalWordsSub')}</div>
          </div>
        </div>
        <div className={styles.reviewsHistogram}>
          <RatingDistribution histogram={histogram} rated={ratedCount} peak={peakRating} />
        </div>
      </div>

      <div className={styles.reviewsToolbar}>
        <div className={styles.reviewsSearch}>
          <Search size={14} strokeWidth={2} className={styles.reviewsSearchIcon} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('profile.reviewsSearchPlaceholder', { n: stats.total })}
            className={styles.reviewsSearchInput}
            aria-label={t('profile.reviewsSearchPlaceholder', { n: stats.total })}
          />
        </div>
        <div className={styles.reviewsSegment} role="group" aria-label={t('profile.sort')}>
          <span className={styles.reviewsSegmentLabel}>{t('profile.sort')}</span>
          {SORT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.reviewsSegmentBtn} ${sortMode === mode ? styles.reviewsSegmentBtnActive : ''}`}
              onClick={() => setSortMode(mode)}
              aria-pressed={sortMode === mode}
            >
              {t(`profile.sortMode.${mode}`)}
            </button>
          ))}
        </div>
        {years.length > 0 ? (
          <div className={styles.reviewsSegment} role="group" aria-label={t('profile.year')}>
            <span className={styles.reviewsSegmentLabel}>{t('profile.year')}</span>
            <button
              type="button"
              className={`${styles.reviewsSegmentBtn} ${year === 'all' ? styles.reviewsSegmentBtnActive : ''}`}
              onClick={() => setYear('all')}
              aria-pressed={year === 'all'}
            >
              {t('profile.yearAll')}
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`${styles.reviewsSegmentBtn} ${year === y ? styles.reviewsSegmentBtnActive : ''}`}
                onClick={() => setYear(y)}
                aria-pressed={year === y}
              >
                {y}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!hasAny ? (
        <div className={styles.emptyInline}>{t('profile.reviewsNoMatches')}</div>
      ) : (
        SENTIMENT_BUCKETS.map((bucket) => {
          const list = grouped[bucket.key] || [];
          if (list.length === 0) return null;
          const isCollapsed = Boolean(collapsed[bucket.key]);
          return (
            <section key={bucket.key} className={styles.reviewsGroup}>
              <div className={styles.reviewsGroupHead}>
                <button
                  type="button"
                  className={styles.reviewsGroupToggle}
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [bucket.key]: !prev[bucket.key] }))
                  }
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight size={14} strokeWidth={2.4} />
                  ) : (
                    <ChevronDown size={14} strokeWidth={2.4} />
                  )}
                  <span className={`${styles.reviewsGroupDot} ${styles[`reviewsGroupDot_${bucket.key}`]}`} />
                  <span className={styles.reviewsGroupLabel}>
                    {t(`profile.sentiment.${bucket.key}`)}
                  </span>
                  {bucket.min !== null ? (
                    <span className={styles.reviewsGroupRange}>
                      {bucket.min.toFixed(1)} – {Math.min(bucket.max, 5).toFixed(1)}
                    </span>
                  ) : null}
                  <span className={styles.reviewsGroupCount}>
                    {t('profile.reviewsGroupCount', { n: list.length })}
                  </span>
                </button>
              </div>
              {!isCollapsed ? (
                <div className={styles.reviewsRows}>
                  {list.map((entry, idx) => (
                    <ReviewRow
                      key={entry.animeId || entry.id || idx}
                      entry={entry}
                      rank={idx + 1}
                      lang={lang}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}

export default translate(ReviewsPanel);
