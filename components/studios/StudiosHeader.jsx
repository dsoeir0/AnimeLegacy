import { translate } from 'react-switch-lang';
import styles from './studios.module.css';

// Page header with the eyebrow, split-gradient title, subtitle, and the
// two page-wide stats (Studios / Productions). Purely presentational — all
// state owned by pages/studios/index.js.
function StudiosHeader({ totals, t }) {
  return (
    <header className={styles.head}>
      <div className={styles.eyebrow}>{t('studios.eyebrow')}</div>
      <div className={styles.headGrid}>
        <div>
          <h1 className={styles.heading}>
            {t('studios.titleStart')}{' '}
            <span className={styles.highlight}>{t('studios.titleEnd')}</span>{' '}
            {t('studios.titleTail')}
          </h1>
          <p className={styles.subtitle}>{t('studios.subtitle')}</p>
        </div>
        <div className={styles.headStats}>
          <div className={styles.headStat}>
            <div className={styles.headStatLabel}>{t('studios.stats.studios')}</div>
            <div className={styles.headStatValue}>
              {totals.totalStudios.toLocaleString()}
            </div>
          </div>
          <div className={styles.headStat}>
            <div className={styles.headStatLabel}>
              {t('studios.stats.productions')}
            </div>
            <div className={styles.headStatValue}>
              {totals.totalProductions.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default translate(StudiosHeader);
