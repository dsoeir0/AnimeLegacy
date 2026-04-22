import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

function GenreBars({ bars, t }) {
  return (
    <div className={styles.asideCard}>
      <div className={styles.asideEyebrow}>
        <span>{t('profile.topGenres')}</span>
        <span className={styles.asideEyebrowMuted}>{t('profile.allTime')}</span>
      </div>
      {bars.length === 0 ? (
        <span className={styles.genreEmpty}>{t('profile.noGenres')}</span>
      ) : (
        <div className={styles.genreBars}>
          {bars.map((g) => (
            <div key={g.name} className={styles.genreBar}>
              <span className={styles.genreName}>{g.name}</span>
              <span className={styles.genreCount}>{g.count}</span>
              <span className={styles.genreTrack}>
                <span className={styles.genreFill} style={{ width: `${g.pct}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default translate(GenreBars);
