import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

// Mirrors FavoriteCharactersStrip — voices have the same shape as
// characters (id, name, nameKanji, imageUrl) but link to /voices/[id].
function FavoriteVoicesStrip({ favorites, limit, emptyMessage, t }) {
  const slice = typeof limit === 'number' ? favorites.slice(0, limit) : favorites;
  if (!slice.length) {
    return (
      <div className={styles.emptyInline}>
        {emptyMessage || t('profile.favoriteVoicesEmpty')}
      </div>
    );
  }
  return (
    <div className={styles.favStrip}>
      {slice.map((favorite, idx) => (
        <Link
          key={favorite.id}
          href={`/voices/${favorite.id}`}
          className={styles.favCard}
        >
          <div className={styles.favPoster}>
            <Image
              src={favorite.imageUrl || '/logo_no_text.png'}
              alt={favorite.name || 'Voice actor'}
              fill
              sizes="200px"
            />
            <span className={styles.favRank}>{String(idx + 1).padStart(2, '0')}</span>
          </div>
          <div className={styles.favMeta}>
            <div className={styles.favTitle}>{favorite.name || '—'}</div>
            {favorite.nameKanji ? (
              <div className={styles.favSub}>{favorite.nameKanji}</div>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default translate(FavoriteVoicesStrip);
