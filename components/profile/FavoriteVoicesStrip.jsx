import { translate } from 'react-switch-lang';
import FavoritePosterGrid from './FavoritePosterGrid';

const getId = (item) => String(item?.id || '');
const getHref = (item) => `/voices/${getId(item)}`;
const getTitle = (item) => item?.name || '—';
const getMeta = (item) => item?.nameKanji || null;
const getImageUrl = (item) => item?.imageUrl || '';

function FavoriteVoicesStrip({ favorites, limit, emptyMessage, onReorder, t }) {
  const slice = typeof limit === 'number' ? (favorites || []).slice(0, limit) : favorites || [];
  return (
    <FavoritePosterGrid
      items={slice}
      getId={getId}
      getHref={getHref}
      getTitle={getTitle}
      getMeta={getMeta}
      getImageUrl={getImageUrl}
      onReorder={onReorder}
      emptyMessage={emptyMessage || t('profile.favoriteVoicesEmpty')}
    />
  );
}

export default translate(FavoriteVoicesStrip);
