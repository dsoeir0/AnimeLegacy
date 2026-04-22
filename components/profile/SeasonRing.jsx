import Link from 'next/link';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import styles from './profile.module.css';

// SVG arc constants for a 34-radius stroke. Precomputed so we don't redo the
// math on every render.
const CIRCUMFERENCE = 2 * Math.PI * 34;

function SeasonRing({ seasonLabel, progress, done, total, t }) {
  const offset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className={styles.asideCard}>
      <div className={styles.asideEyebrow}>
        <span>
          {t('profile.seasonTitleProgress', { season: seasonLabel || 'Season' })}
        </span>
      </div>
      <div className={styles.ringWrap}>
        <div className={styles.ring}>
          <svg viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--al-ink-4)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="url(#al-ring-grad)"
              strokeWidth="6"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="al-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--al-primary-1)" />
                <stop offset="1" stopColor="var(--al-primary-2)" />
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.ringPct}>{progress}%</div>
        </div>
        <div className={styles.ringText}>
          <div className={styles.ringN}>
            {t('profile.seasonTracked', { done, total })}
          </div>
          <div className={styles.ringHint}>
            {t('profile.seasonHintBody', { n: total })}
          </div>
        </div>
      </div>
      <Link href="/my-list" className={styles.seasonLink}>
        <Button variant="ghost" size="sm" fullWidth>
          {t('actions.openMyList')}
        </Button>
      </Link>
    </div>
  );
}

export default translate(SeasonRing);
