import { useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import useDragReorder from '../../hooks/useDragReorder';
import { mergeReorderedSlice } from '../../lib/utils/reorder';
import ReorderControls from './ReorderControls';
import styles from './profile.module.css';

const DEFAULT_SIZES = '(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 240px';

function FavoritePosterGrid({
  items,
  getId,
  getHref,
  getTitle,
  getMeta,
  getImageUrl,
  onReorder,
  emptyMessage,
  imageSizes = DEFAULT_SIZES,
}) {
  const handleReorder = useCallback(
    (orderedIds) => {
      if (typeof onReorder !== 'function') return;
      onReorder(mergeReorderedSlice((items || []).map(getId), orderedIds));
    },
    [items, getId, onReorder],
  );
  const { sorted, dragId, overId, onDragStart, onDragOver, onDrop, onDragEnd, move } =
    useDragReorder({ items: items || [], getId, onReorder: handleReorder });

  if (sorted.length === 0) {
    return emptyMessage ? <div className={styles.emptyInline}>{emptyMessage}</div> : null;
  }

  return (
    <div className={styles.topFavGrid}>
      {sorted.map((item, idx) => {
        const id = getId(item);
        const isDragging = dragId === id;
        const isOver = overId === id;
        const cover = getImageUrl(item);
        const meta = getMeta ? getMeta(item) : null;
        const title = getTitle(item);
        return (
          <div
            key={id}
            draggable
            onDragStart={onDragStart(id)}
            onDragOver={onDragOver(id)}
            onDrop={onDrop(id)}
            onDragEnd={onDragEnd}
            className={`${styles.topFavCard} ${isDragging ? styles.topFavDragging : ''} ${isOver ? styles.topFavOver : ''}`}
          >
            <Link href={getHref(item)} className={styles.topFavLink} draggable={false}>
              {cover ? (
                <Image
                  src={cover}
                  alt={title || ''}
                  fill
                  sizes={imageSizes}
                  className={styles.topFavImg}
                />
              ) : null}
              <span className={styles.topFavRank}>{String(idx + 1).padStart(2, '0')}</span>
              <span className={styles.topFavGradient} />
              {meta ? <span className={styles.topFavMeta}>{meta}</span> : null}
              <span className={styles.topFavTitle}>{title}</span>
            </Link>
            <ReorderControls
              canMoveUp={idx > 0}
              canMoveDown={idx < sorted.length - 1}
              onMoveUp={() => move(id, -1)}
              onMoveDown={() => move(id, 1)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default translate(FavoritePosterGrid);
