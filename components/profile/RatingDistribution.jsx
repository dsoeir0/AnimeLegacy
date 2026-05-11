import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

function RatingDistribution({ histogram, rated, peak, t }) {
  const max = histogram.reduce((m, b) => (b.count > m ? b.count : m), 0);
  if (rated === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.distroHead}>
          <h3 className={styles.sectionTitle}>{t('profile.ratingDistribution')}</h3>
        </div>
        <div className={styles.emptyInline}>{t('profile.ratingDistributionEmpty')}</div>
      </div>
    );
  }
  return (
    <div className={styles.section}>
      <div className={styles.distroHead}>
        <h3 className={styles.sectionTitle}>{t('profile.ratingDistribution')}</h3>
        <span className={styles.kicker}>
          {t('profile.ratingDistributionMeta', { n: rated, peak })}
        </span>
      </div>
      <div className={styles.distroChart} role="img" aria-label={t('profile.ratingDistribution')}>
        {histogram.map((b) => {
          const h = max > 0 ? Math.max(4, (b.count / max) * 100) : 4;
          const isPeak = b.count > 0 && b.count === max;
          return (
            <div key={b.score} className={styles.distroCol}>
              <span
                className={`${styles.distroBar} ${isPeak ? styles.distroBarPeak : ''}`}
                style={{ height: `${h}%` }}
                title={`${b.score}: ${b.count}`}
              />
              <span className={styles.distroLabel}>{b.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default translate(RatingDistribution);
