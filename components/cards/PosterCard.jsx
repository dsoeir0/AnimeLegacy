import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, TrendingUp, Star } from 'lucide-react';
import { toCardShape } from '../../lib/utils/cardShape';
import { formatFivePoint } from '../../lib/utils/rating';
import styles from './PosterCard.module.css';

function PosterCard({ anime, media, inList, onClick, width = 200, showMeta = true, href, sizes }) {
  const card = toCardShape(anime, media);
  if (!card) return null;
  const content = (
    <div
      className={styles.wrap}
      style={{ width }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={styles.poster}>
        <Image
          className={styles.posterImage}
          src={card.poster}
          alt={card.title}
          fill
          sizes={
            sizes ||
            (typeof width === 'number'
              ? `${width}px`
              : '(max-width: 768px) 33vw, (max-width: 1200px) 33vw, 320px')
          }
        />
        <div className={styles.gradient} />
        {card.rank && card.rank <= 100 ? (
          <div className={styles.rank}>
            <TrendingUp size={11} className={styles.rankIcon} />
            <span className={styles.rankNum}>#{card.rank}</span>
          </div>
        ) : null}
        {inList ? (
          <div className={styles.inList} aria-label="In your list">
            <Check size={14} strokeWidth={2.5} />
          </div>
        ) : null}
        <div className={styles.scorePill}>
          <Star size={10} strokeWidth={1.5} className={styles.scoreStar} />
          <span className={styles.scoreNum}>{formatFivePoint(card.score) ?? 'NR'}</span>
        </div>
      </div>
      {showMeta ? (
        <div className={styles.meta}>
          <div className={styles.title}>{card.title}</div>
          <div className={styles.sub}>
            <span className={styles.studio}>{card.studio?.split(' / ')[0] || '—'}</span>
            <span className={styles.dot} />
            <span className={styles.year}>{card.year || '—'}</span>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={styles.link}>
        {content}
      </Link>
    );
  }
  return content;
}

export default memo(PosterCard);
