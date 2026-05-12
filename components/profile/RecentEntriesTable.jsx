import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import StatusBadge from '../ui/StatusBadge';
import { getAnimeThumbUrl } from '../../lib/utils/media';
import styles from './profile.module.css';

function RecentEntriesTable({ entries, total, onSeeAll, t }) {
  if (!entries || entries.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.distroHead}>
          <h3 className={styles.sectionTitle}>{t('profile.recentEntries')}</h3>
        </div>
        <div className={styles.emptyInline}>{t('profile.recentEntriesEmpty')}</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.distroHead}>
        <h3 className={styles.sectionTitle}>{t('profile.recentEntries')}</h3>
        <span className={styles.kicker}>
          {t('profile.recentEntriesMeta', { shown: entries.length, total })}
        </span>
        {onSeeAll ? (
          <button type="button" className={styles.sectionLink} onClick={onSeeAll}>
            {t('profile.viewAll')}
          </button>
        ) : null}
      </div>
      <div className={styles.entriesTable}>
        <div className={styles.entriesHead}>
          <span>#</span>
          <span>{t('profile.col.title')}</span>
          <span>{t('profile.col.status')}</span>
          <span>{t('profile.col.progress')}</span>
          <span>{t('profile.col.score')}</span>
        </div>
        {entries.map((entry, idx) => {
          const id = entry.animeId || entry.id;
          const thumb = getAnimeThumbUrl(entry);
          const studio = Array.isArray(entry.studios) && entry.studios[0]
            ? typeof entry.studios[0] === 'string'
              ? entry.studios[0]
              : entry.studios[0].name
            : '';
          return (
            <Link key={id} href={`/anime/${id}`} className={styles.entriesRow}>
              <span className={styles.entriesIndex}>{String(idx + 1).padStart(2, '0')}</span>
              <span className={styles.entriesTitle}>
                <span className={styles.entriesThumb}>
                  {thumb ? (
                    <Image src={thumb} alt={entry.title || ''} fill sizes="40px" />
                  ) : null}
                </span>
                <span className={styles.entriesTitleText}>
                  <span className={styles.entriesTitleName}>{entry.title}</span>
                  <span className={styles.entriesTitleMeta}>
                    {studio ? <>{studio} · </> : null}
                    {entry.year || '—'}
                    {entry.type ? <> · {entry.type}</> : null}
                  </span>
                </span>
              </span>
              <span><StatusBadge status={entry.status} size="xs" /></span>
              <span className={styles.entriesProgress}>
                {Number.isFinite(entry.progress) ? entry.progress : 0}
                {entry.episodesTotal ? <>/{entry.episodesTotal}</> : null}
              </span>
              <span className={styles.entriesScore}>
                {Number.isFinite(entry.rating) ? entry.rating.toFixed(1) : '—'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default translate(RecentEntriesTable);
