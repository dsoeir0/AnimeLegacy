import { Star } from 'lucide-react';
import styles from './RatingDisplay.module.css';

export default function RatingDisplay({ score, size = 'md', label = 'MAL' }) {
  const value = typeof score === 'number' ? score : Number(score);
  const safe = Number.isFinite(value) ? value : 0;
  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 20 : 14;
  return (
    <div className={`${styles.wrap} ${styles[`size_${size}`]}`}>
      <Star size={iconSize} strokeWidth={1.5} className={styles.star} />
      <span className={styles.score}>{safe.toFixed(2)}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
