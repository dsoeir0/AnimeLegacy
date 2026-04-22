import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

// Ranked grid of favorite anime. The page passes `limit` to trim for the
// Overview tab (shows 6) and omits it for the full Favorites tab.
function FavoritesStrip({ favorites, limit, t }) {
  const slice = typeof limit === 'number' ? favorites.slice(0, limit) : favorites;
  if (!slice.length) {
    return <div className={styles.emptyInline}>{t('profile.favoritesEmpty')}</div>;
  }
  return (
    <div className={styles.favStrip}>
      {slice.map((favorite, idx) => {
        const favoriteId = favorite.animeId || favorite.id;
        const poster = favorite.posterUrl || favorite.image || '/logo_no_text.png';
        return (
          <Link key={favoriteId} href={`/anime/${favoriteId}`} className={styles.favCard}>
            <div className={styles.favPoster}>
              <Image src={poster} alt={favorite.title || 'Favorite'} fill sizes="200px" />
              <span className={styles.favRank}>{String(idx + 1).padStart(2, '0')}</span>
              <span className={styles.favHeart}>
                <Heart size={14} fill="currentColor" strokeWidth={0} />
              </span>
            </div>
            <div className={styles.favMeta}>
              <div className={styles.favTitle}>{favorite.title || 'Untitled'}</div>
              <div className={styles.favSub}>
                {favorite.year || '—'} · {(favorite.type || 'TV').toUpperCase()}
              </div>
              {typeof favorite.malScore === 'number' ? (
                <div className={styles.favScore}>
                  <Star size={11} fill="currentColor" strokeWidth={0} />
                  {favorite.malScore.toFixed(1)}
                </div>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default translate(FavoritesStrip);
