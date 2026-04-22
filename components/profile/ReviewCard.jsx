import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { formatRelativeTime } from '../../lib/utils/time';
import styles from './profile.module.css';

// Ring colour: rating ≥4 → warm (default), =3 → neutral mid, <3 → danger.
const ringClass = (rating, styles) => {
  if (rating === null) return styles.reviewScoreMid;
  if (rating >= 4) return '';
  if (rating === 3) return styles.reviewScoreMid;
  return styles.reviewScoreLow;
};

function ReviewCard({ entry, t }) {
  const targetId = entry.animeId || entry.id;
  const poster = entry.posterUrl || entry.image || entry.coverImage || '/logo_no_text.png';
  const rating = typeof entry.rating === 'number' ? entry.rating : null;

  return (
    <Link href={`/anime/${targetId}`} className={styles.reviewCard}>
      <div className={styles.reviewPoster}>
        <Image
          src={poster}
          alt={entry.title || 'Anime'}
          width={64}
          height={92}
          sizes="64px"
          quality={85}
        />
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
      <div className={`${styles.reviewScore} ${ringClass(rating, styles)}`}>
        {rating !== null ? rating.toFixed(1) : '—'}
      </div>
    </Link>
  );
}

export default translate(ReviewCard);
