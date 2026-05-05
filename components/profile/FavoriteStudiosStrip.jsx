import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

function FavoriteStudiosStrip({ favorites, limit, emptyMessage, t }) {
  const slice = typeof limit === 'number' ? favorites.slice(0, limit) : favorites;
  if (!slice.length) {
    return (
      <div className={styles.emptyInline}>
        {emptyMessage || t('profile.favoriteStudiosEmpty')}
      </div>
    );
  }
  return (
    <div className={styles.favStrip}>
      {slice.map((favorite, idx) => {
        const year = (() => {
          if (!favorite.established) return null;
          const y = new Date(favorite.established).getFullYear();
          return Number.isFinite(y) ? y : null;
        })();
        return (
          <Link
            key={favorite.id}
            href={`/studios/${favorite.id}`}
            className={styles.favCard}
          >
            <div className={styles.favPoster}>
              <Image
                src={favorite.imageUrl || '/logo_no_text.png'}
                alt={favorite.name || 'Studio'}
                fill
                sizes="200px"
              />
              <span className={styles.favRank}>{String(idx + 1).padStart(2, '0')}</span>
            </div>
            <div className={styles.favMeta}>
              <div className={styles.favTitle}>{favorite.name || '—'}</div>
              {year ? <div className={styles.favSub}>{year}</div> : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default translate(FavoriteStudiosStrip);
