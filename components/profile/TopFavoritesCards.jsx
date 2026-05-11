import { translate } from 'react-switch-lang';
import { FAVORITE_LIMIT } from '../../lib/constants';
import { getAnimeImageUrl } from '../../lib/utils/media';
import FavoritePosterGrid from './FavoritePosterGrid';
import styles from './profile.module.css';

const getId = (item) => String(item?.animeId || item?.id || '');
const getHref = (item) => `/anime/${getId(item)}`;
const getTitle = (item) => item?.title || '';
const buildGetImageUrl = (aniListMap) => (item) =>
  getAnimeImageUrl(item, aniListMap?.[getId(item)]);
const getMeta = (item) => {
  const type = item?.type || '';
  const eps = item?.episodesTotal ? ` / ${item.episodesTotal} EP` : '';
  return type ? `${type}${eps}` : null;
};

function TopFavoritesCards({ favorites, aniListMap, onReorder, t }) {
  const top = (favorites || []).slice(0, FAVORITE_LIMIT);
  if (top.length === 0) return null;
  return (
    <div className={styles.section}>
      <div className={styles.distroHead}>
        <h3 className={styles.sectionTitle}>{t('profile.topFavorites', { n: FAVORITE_LIMIT })}</h3>
        <span className={styles.kicker}>{t('profile.topFavoritesMeta')}</span>
      </div>
      <FavoritePosterGrid
        items={top}
        getId={getId}
        getHref={getHref}
        getTitle={getTitle}
        getMeta={getMeta}
        getImageUrl={buildGetImageUrl(aniListMap)}
        onReorder={onReorder}
        imageSizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 300px"
      />
    </div>
  );
}

export default translate(TopFavoritesCards);
