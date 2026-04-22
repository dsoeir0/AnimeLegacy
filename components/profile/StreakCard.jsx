import { Flame } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

function StreakCard({ streak, dots, t }) {
  return (
    <div className={styles.asideCard}>
      <div className={styles.asideEyebrow}>
        <span>{t('profile.streakTitle')}</span>
        <span className={styles.asideEyebrowMuted}>
          <Flame size={12} />
        </span>
      </div>
      <div className={styles.streakNum}>
        {streak}
        <span className={styles.streakUnit}>{t('profile.streakUnit')}</span>
      </div>
      <div className={styles.streakHint}>
        {streak > 0
          ? t('profile.streakBody', { next: Math.max(streak + 7, 7) })
          : t('profile.streakBodyNone')}
      </div>
      <div className={styles.streakDots}>
        {dots.map((dot) => (
          <span
            key={dot.key}
            className={`${styles.streakDot} ${
              dot.today
                ? styles.streakDotToday
                : dot.active
                  ? styles.streakDotOn
                  : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default translate(StreakCard);
