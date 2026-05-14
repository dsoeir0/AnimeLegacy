import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { getAnimeThumbUrl } from '../../lib/utils/media';
import { toJsDate } from '../../lib/utils/profileActivity';
import { wordCount } from '../../lib/utils/reviewsView';
import styles from './profile.module.css';

const formatShortDate = (entry, lang) => {
  const d = toJsDate(entry?.updatedAt ?? entry?.addedAt);
  if (!d) return '';
  return new Intl.DateTimeFormat(lang || 'en', { month: 'short', day: '2-digit' })
    .format(d)
    .toUpperCase();
};

const scoreClass = (rating, s) => {
  if (rating === null || rating === undefined) return s.reviewRowScoreMid;
  if (rating >= 4) return '';
  if (rating >= 3) return s.reviewRowScoreMid;
  return s.reviewRowScoreLow;
};

function ReviewRow({ entry, rank, lang, t }) {
  const id = entry.animeId || entry.id;
  const thumb = getAnimeThumbUrl(entry) || entry.posterUrl || '';
  const rating = typeof entry.rating === 'number' ? entry.rating : null;
  const words = wordCount(entry.review);
  const date = formatShortDate(entry, lang);

  const body = (
    <>
      <span className={styles.reviewRowRank}>{String(rank).padStart(3, '0')}</span>
      <span className={styles.reviewRowThumb}>
        {thumb ? <Image src={thumb} alt={entry.title || ''} fill sizes="48px" /> : null}
      </span>
      <span className={styles.reviewRowBody}>
        <span className={styles.reviewRowTitle}>
          {entry.review ? entry.review.split(/[.!?\n]/)[0].slice(0, 80) : entry.title || '—'}
        </span>
        <span className={styles.reviewRowSub}>
          {t('profile.reviewOn', { title: entry.title || '—' })}
        </span>
      </span>
      <span className={`${styles.reviewRowScore} ${scoreClass(rating, styles)}`}>
        {rating !== null ? rating.toFixed(1) : '—'}
      </span>
      <span className={styles.reviewRowWords}>{words > 0 ? `${words}w` : '—'}</span>
      <span className={styles.reviewRowDate}>{date}</span>
    </>
  );

  if (id) {
    return (
      <Link href={`/anime/${id}`} className={styles.reviewRow}>
        {body}
      </Link>
    );
  }
  return <div className={styles.reviewRow}>{body}</div>;
}

export default translate(ReviewRow);
