import Link from 'next/link';
import Image from 'next/image';
import { Bookmark } from 'lucide-react';
import RatingDisplay from '../ui/RatingDisplay';
import { toCardShape } from '../../lib/utils/cardShape';
import styles from './DetailedCard.module.css';

export default function DetailedCard({ anime, media, inList, onClick, href }) {
  const card = toCardShape(anime, media);
  if (!card) return null;
  const inner = (
    <div className={styles.wrap} onClick={onClick}>
      <div className={styles.poster}>
        <Image
          className={styles.posterImage}
          src={card.banner || card.poster}
          alt={card.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className={styles.gradient} />
        <div className={styles.overlay}>
          <div className={styles.titleBlock}>
            <div className={styles.studio}>{card.studio}</div>
            <div className={styles.title}>{card.title}</div>
          </div>
          <RatingDisplay score={card.score} size="sm" />
        </div>
      </div>
      <div className={styles.body}>
        <p className={styles.synopsis}>{card.synopsis || 'No synopsis available.'}</p>
        <div className={styles.footer}>
          <div className={styles.genres}>
            {card.genres.slice(0, 2).map((g) => (
              <span key={g} className={styles.genre}>
                {g}
              </span>
            ))}
          </div>
          {inList ? <Bookmark size={14} strokeWidth={1.5} className={styles.bookmark} /> : null}
        </div>
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
