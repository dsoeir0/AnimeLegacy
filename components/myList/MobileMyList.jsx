import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Filter, Search, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { resolveStatus } from '../../lib/utils/listTransitions';
import styles from './MobileMyList.module.css';

const STATUS_META = {
  watching: { labelKey: 'myList.tabs.watching', cssColor: 'var(--al-status-watching)' },
  completed: { labelKey: 'myList.tabs.completed', cssColor: 'var(--al-status-completed)' },
  plan: { labelKey: 'myList.tabs.plan', cssColor: 'var(--al-fg-2)' },
  on_hold: { labelKey: 'myList.tabs.onHold', cssColor: 'var(--al-warn)' },
  hold: { labelKey: 'myList.tabs.onHold', cssColor: 'var(--al-warn)' },
  dropped: { labelKey: 'myList.tabs.dropped', cssColor: 'var(--al-status-dropped)' },
};

const SORT_OPTIONS = [
  { id: 'default', labelKey: 'myList.mobileSort.default' },
  { id: 'title', labelKey: 'myList.mobileSort.title' },
  { id: 'rating', labelKey: 'myList.mobileSort.rating' },
];

function StatusRow({ entry, detail, t }) {
  const cover = getAnimeImageUrl(entry);
  const status = resolveStatus(detail?.status, Boolean(entry?.airing));
  const meta = STATUS_META[status] || STATUS_META.plan;
  const progress = Number(detail?.progress || 0);
  const total = Number(entry?.episodesTotal ?? entry?.episodes ?? 0);
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  const rating = typeof detail?.rating === 'number' ? detail.rating : null;
  return (
    <Link href={`/anime/${entry.id}`} className={styles.row}>
      <span className={styles.rowCover}>
        {cover ? <Image src={cover} alt="" fill sizes="56px" /> : null}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowStatus}>
          <span
            className={styles.statusDot}
            style={{ background: meta.cssColor }}
            aria-hidden="true"
          />
          <span className={styles.statusLabel} style={{ color: meta.cssColor }}>
            {t(meta.labelKey)}
          </span>
        </span>
        <span className={styles.rowTitle}>{entry.title || '—'}</span>
        <span className={styles.rowProgress}>
          <span className={styles.rowProgressLabel}>
            {status === 'plan'
              ? '—'
              : total > 0
                ? `EP ${progress}/${total}`
                : t('myList.mobileEpisodes', { n: progress })}
          </span>
          {status !== 'plan' && total > 0 ? (
            <span className={styles.rowProgressBar}>
              <span
                className={styles.rowProgressFill}
                style={{ width: `${pct}%`, background: meta.cssColor }}
              />
            </span>
          ) : null}
        </span>
      </span>
      <span className={styles.rowRight}>
        {rating !== null ? (
          <span className={styles.rowScore}>{rating.toFixed(1)}</span>
        ) : (
          <span className={styles.rowScoreEmpty}>—</span>
        )}
        <ChevronRight size={14} strokeWidth={2} className={styles.rowChevron} />
      </span>
    </Link>
  );
}

function MobileMyList({
  list,
  orderedList,
  detailsById,
  statusCounts,
  stats,
  filters,
  activeFilter,
  setActiveFilter,
  searchTerm,
  setSearchTerm,
  airingNowCount,
  onPauseCount,
  thisYearCount,
  t,
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(searchTerm));
  const [sortKey, setSortKey] = useState('default');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRootRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const onPointer = (e) => {
      if (!sortRootRef.current?.contains(e.target)) setSortOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);

  const visibleList = useMemo(() => {
    const base = Array.isArray(orderedList) ? orderedList : [];
    if (sortKey === 'default') return base;
    const sorted = [...base];
    if (sortKey === 'title') {
      sorted.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (sortKey === 'rating') {
      sorted.sort((a, b) => {
        const ra = detailsById.get(String(a?.id))?.rating;
        const rb = detailsById.get(String(b?.id))?.rating;
        const va = typeof ra === 'number' ? ra : -1;
        const vb = typeof rb === 'number' ? rb : -1;
        return vb - va;
      });
    }
    return sorted;
  }, [orderedList, sortKey, detailsById]);

  const daysWatched = stats?.hours ? Math.round(stats.hours / 24) : 0;
  const meanScore = typeof stats?.meanScore === 'number' ? stats.meanScore.toFixed(1) : null;
  const activeSort = SORT_OPTIONS.find((o) => o.id === sortKey) || SORT_OPTIONS[0];

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchTerm('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  return (
    <div className={styles.mobileMyList}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.headerEyebrow}>{t('myList.mobileEyebrow')}</span>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.iconBtn} ${searchOpen ? styles.iconBtnActive : ''}`}
              aria-label={t('myList.searchPlaceholder')}
              aria-pressed={searchOpen}
              onClick={toggleSearch}
            >
              <Search size={14} strokeWidth={2} />
            </button>
            <div className={styles.filterRoot} ref={sortRootRef}>
              <button
                type="button"
                className={`${styles.iconBtn} ${sortOpen ? styles.iconBtnActive : ''}`}
                aria-label={t('myList.mobileFilterAria')}
                aria-haspopup="menu"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((v) => !v)}
              >
                <Filter size={14} strokeWidth={2} />
              </button>
              {sortOpen ? (
                <div className={styles.sortMenu} role="menu">
                  <div className={styles.sortHead}>{t('myList.mobileSort.heading')}</div>
                  {SORT_OPTIONS.map((opt) => {
                    const on = sortKey === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={on}
                        className={`${styles.sortOption} ${on ? styles.sortOptionActive : ''}`}
                        onClick={() => {
                          setSortKey(opt.id);
                          setSortOpen(false);
                        }}
                      >
                        {t(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {searchOpen ? (
          <div className={styles.searchBox}>
            <Search size={14} strokeWidth={2} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('myList.searchPlaceholder')}
              className={styles.searchInput}
              aria-label={t('myList.searchPlaceholder')}
            />
            {searchTerm ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchTerm('')}
                aria-label={t('actions.clear')}
              >
                <X size={12} strokeWidth={2} />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className={styles.headerCountRow}>
          <span className={styles.headerCount}>{list.length}</span>
          <span className={styles.headerCountLabel}>{t('myList.mobileTitlesLabel')}</span>
        </div>
        <div className={styles.headerStats}>
          {daysWatched > 0
            ? t('myList.mobileStatsDays', { n: daysWatched.toLocaleString() })
            : t('myList.mobileStatsNoDays')}
          {stats?.hours ? (
            <>
              <span className={styles.headerStatsDot} />
              {t('myList.mobileStatsHours', { n: Math.round(stats.hours).toLocaleString() })}
            </>
          ) : null}
          {meanScore ? (
            <>
              <span className={styles.headerStatsDot} />
              {t('myList.mobileStatsMean', { n: meanScore })}
            </>
          ) : null}
          {sortKey !== 'default' ? (
            <>
              <span className={styles.headerStatsDot} />
              <span>{t('myList.mobileSort.activeLabel', { name: t(activeSort.labelKey) })}</span>
            </>
          ) : null}
        </div>

        <div className={styles.kpiStrip}>
          <div className={styles.kpiCell}>
            <span className={styles.kpiValue} style={{ color: 'var(--al-status-watching)' }}>
              {airingNowCount}
            </span>
            <span className={styles.kpiLabel}>{t('myList.mobileKpiAiring')}</span>
          </div>
          <div className={styles.kpiCell}>
            <span className={styles.kpiValue}>{onPauseCount}</span>
            <span className={styles.kpiLabel}>{t('myList.mobileKpiOnPause')}</span>
          </div>
          <div className={styles.kpiCell}>
            <span className={styles.kpiValue} style={{ color: 'var(--al-warm-ink)' }}>
              {thisYearCount}
            </span>
            <span className={styles.kpiLabel}>{t('myList.mobileKpiThisYear')}</span>
          </div>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {filters.map((f) => {
          const on = activeFilter === f.id;
          const count = statusCounts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.tab} ${on ? styles.tabActive : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {t(f.labelKey)}
              <span className={styles.tabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.list}>
        {visibleList.length === 0 ? (
          <div className={styles.empty}>
            {searchTerm
              ? t('myList.mobileEmptySearch', { q: searchTerm })
              : t('myList.mobileEmpty')}
          </div>
        ) : (
          visibleList.map((entry) => (
            <StatusRow
              key={entry.id}
              entry={entry}
              detail={detailsById.get(String(entry.id)) || {}}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default translate(MobileMyList);
