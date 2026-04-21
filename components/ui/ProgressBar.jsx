import styles from './ProgressBar.module.css';

export default function ProgressBar({ value = 0, total = 0, variant = 'primary', showLabel = true }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const fillClass = variant === 'completed' ? styles.fillCompleted : variant === 'warm' ? styles.fillWarm : styles.fillPrimary;
  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <div className={`${styles.fill} ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel ? (
        <div className={styles.labels}>
          <span className={styles.count}>
            {value} <span className={styles.of}>/ {total}</span>
          </span>
          <span className={styles.pct}>{Math.round(pct)}%</span>
        </div>
      ) : null}
    </div>
  );
}
