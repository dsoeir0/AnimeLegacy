import styles from './Logo.module.css';

export default function Logo({ size = 28, showWordmark = true }) {
  return (
    <div className={styles.wrap}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={styles.mark}>
        <defs>
          <linearGradient id="al-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6f83ff" />
            <stop offset="100%" stopColor="#84d9ff" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#al-logo-grad)" />
        <path
          d="M10 22 L16 9 L22 22 M12.5 18 L19.5 18"
          stroke="#060709"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showWordmark ? (
        <div className={styles.wordmark}>
          <span className={styles.name}>AnimeLegacy</span>
          <span className={styles.eyebrow}>TRACKER · CHRONICLE</span>
        </div>
      ) : null}
    </div>
  );
}
