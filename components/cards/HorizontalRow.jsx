import Image from 'next/image';
import Link from 'next/link';
import { Heart, MoreHorizontal } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import RatingDisplay from '../ui/RatingDisplay';
import IconButton from '../ui/IconButton';
import { toCardShape } from '../../lib/utils/cardShape';
import styles from './HorizontalRow.module.css';

export default function HorizontalRow({ anime, media, entry, onClick, onEdit, href }) {
  const card = toCardShape(anime, media);
  if (!card) return null;
  const total = entry?.episodesTotal ?? entry?.total ?? card.episodes ?? 0;
  const progress = entry?.progress ?? 0;
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  const score = entry?.rating ?? entry?.score ?? 0;

  const inner = (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.poster}>
        <Image src={card.poster} alt={card.title} fill sizes="72px" className={styles.posterImage} />
      </div>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <div className={styles.title}>{card.title}</div>
          {entry?.isFavorite || entry?.favorite ? (
            <Heart size={13} strokeWidth={1.5} className={styles.heart} />
          ) : null}
        </div>
        <div className={styles.subRow}>
          <span className={styles.eyebrow}>{card.studio?.split(' / ')[0] || '—'}</span>
          <span className={styles.dotSep} />
          <span className={styles.num}>
            {card.year || '—'} {card.season ? `· ${card.season}` : ''}
          </span>
          <span className={styles.dotSep} />
          <span className={styles.num}>
            {card.type} {card.episodes ? `· ${card.episodes} ep` : ''}
          </span>
        </div>
        {entry ? (
          <div className={styles.progressRow}>
            <StatusBadge status={entry.status} size="xs" />
            <div className={styles.progressTrackWrap}>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${
                    entry.status === 'completed' ? styles.progressFillCompleted : ''
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {progress}/{total}
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <div className={styles.right}>
        {entry && score > 0 ? (
          <div className={styles.yourScore}>
            <div className={styles.eyebrow}>Your score</div>
            <div className={styles.yourScoreNum}>{score}</div>
          </div>
        ) : null}
        {!entry ? <RatingDisplay score={card.score} size="sm" /> : null}
        {onEdit ? (
          <IconButton
            icon={MoreHorizontal}
            tooltip="Edit"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit();
            }}
          />
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={styles.link}>
        {inner}
      </Link>
    );
  }
  return inner;
}
