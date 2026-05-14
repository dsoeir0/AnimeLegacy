import { memo } from 'react';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import styles from './discover.module.css';

function GenreRail({ genres, t }) {
  if (!Array.isArray(genres) || genres.length === 0) return null;
  const sorted = [...genres].sort((a, b) => (b.count || 0) - (a.count || 0));
  const max = sorted[0]?.count || 1;
  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>
            {t('discoverPage.genres.eyebrow')}
          </div>
          <h2 className={styles.sectionTitle}>
            {t('discoverPage.genres.heading')}
          </h2>
        </div>
      </div>
      <div className={styles.genreRail}>
        {sorted.map((g) => {
          const count = typeof g.count === 'number' ? g.count : 0;
          const pct = max > 0 ? Math.max(4, (count / max) * 100) : 0;
          return (
            <Link
              key={g.mal_id}
              href={`/search?genre=${g.mal_id}`}
              className={styles.genreCell}
            >
              <div className={styles.genreCellHead}>
                <span className={styles.genreCellName}>{g.name}</span>
                <span className={styles.genreCellCount}>
                  {count.toLocaleString()}
                </span>
              </div>
              <div className={styles.genreCellTrack}>
                <div
                  className={styles.genreCellFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default translate(memo(GenreRail));
