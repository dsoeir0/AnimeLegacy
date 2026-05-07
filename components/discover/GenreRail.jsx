import Link from 'next/link';
import { translate } from 'react-switch-lang';
import styles from './discover.module.css';

function GenreRail({ genres, t }) {
  if (!Array.isArray(genres) || genres.length === 0) return null;
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
        {genres.map((g) => (
          <Link
            key={g.mal_id}
            href={`/search?genre=${g.mal_id}`}
            className={styles.genreChip}
          >
            {g.name}
            <span className={styles.genreChipCount}>
              {typeof g.count === 'number' ? g.count.toLocaleString() : ''}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

export default translate(GenreRail);
