import { translate } from 'react-switch-lang';
import FavoritePosterGrid from './FavoritePosterGrid';

const getId = (item) => String(item?.id || '');
const getHref = (item) => `/studios/${getId(item)}`;
const getTitle = (item) => item?.name || '—';
const getMeta = (item) => {
  if (!item?.established) return null;
  const y = new Date(item.established).getFullYear();
  return Number.isFinite(y) ? String(y) : null;
};
const getImageUrl = (item) => item?.imageUrl || '';

function FavoriteStudiosStrip({ favorites, limit, emptyMessage, onReorder, t }) {
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
      emptyMessage={emptyMessage || t('profile.favoriteStudiosEmpty')}
    />
  );
}

export default translate(FavoriteStudiosStrip);
