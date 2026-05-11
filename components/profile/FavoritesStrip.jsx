import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import FavoritePosterGrid from './FavoritePosterGrid';

const getId = (item) => String(item?.animeId || item?.id || '');
const getHref = (item) => `/anime/${getId(item)}`;
const getTitle = (item) => item?.title || 'Untitled';
const buildGetImageUrl = (aniListMap) => (item) =>
  getAnimeImageUrl(item, aniListMap?.[getId(item)]);
const getMeta = (item) => {
  const year = item?.year || null;
  const type = (item?.type || 'TV').toUpperCase();
  return year ? `${year} · ${type}` : type;
};

function FavoritesStrip({ favorites, limit, aniListMap, onReorder, t }) {
  const slice = typeof limit === 'number' ? (favorites || []).slice(0, limit) : favorites || [];
  return (
    <FavoritePosterGrid
      items={slice}
      getId={getId}
      getHref={getHref}
      getTitle={getTitle}
      getMeta={getMeta}
      getImageUrl={buildGetImageUrl(aniListMap)}
      onReorder={onReorder}
      emptyMessage={t('profile.favoritesEmpty')}
    />
  );
}

export default translate(FavoritesStrip);
