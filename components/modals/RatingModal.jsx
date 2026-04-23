import { useEffect, useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Modal from './Modal';
import modalStyles from './Modal.module.css';
import styles from './RatingModal.module.css';

const buildStarState = (rating, starIndex) => {
  const fullValue = starIndex;
  const halfValue = starIndex - 0.5;
  if (typeof rating !== 'number') return 'empty';
  if (rating >= fullValue) return 'full';
  if (rating >= halfValue) return 'half';
  return 'empty';
};

function RatingModal({ open, anime, initialRating, onClose, onSave, t }) {
  const [rating, setRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(null);

  useEffect(() => {
    if (!open) return;
    setRating(typeof initialRating === 'number' ? initialRating : null);
    setHoverRating(null);
  }, [open, initialRating]);

  const effectiveRating = hoverRating ?? rating;
  const hasExisting = typeof initialRating === 'number';
  const saveDisabled = rating === null && !hasExisting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="rating-modal-title"
      backdropImage={anime?.banner || anime?.image || null}
      closeLabel={t('actions.close')}
      footer={
        <>
          <button className={modalStyles.btnSecondary} type="button" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            className={modalStyles.btnPrimary}
            type="button"
            disabled={saveDisabled}
            onClick={() => onSave({ rating: typeof rating === 'number' ? rating : null })}
          >
            {hasExisting ? t('modal.rating.update') : t('modal.rating.save')}
          </button>
        </>
      }
    >
      <div className={styles.head}>
        <div className={styles.eyebrow}>{t('modal.rating.titleOnly')}</div>
        <h2 id="rating-modal-title" className={styles.title}>
          {anime?.title || 'Untitled'}
        </h2>
        <div className={styles.metaRow}>
          <span>{anime?.type || t('modal.addToList.typeFallback')}</span>
          <span className={styles.metaDot} aria-hidden="true">·</span>
          <span>
            {anime?.episodes
              ? t('modal.addToList.episodesShort', { n: anime.episodes })
              : t('modal.addToList.ongoing')}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.posterWrap}>
          {anime?.image ? (
            <img
              src={anime.image}
              alt={anime?.title || 'Anime poster'}
              className={styles.poster}
            />
          ) : (
            <div className={styles.posterFallback} />
          )}
        </div>

        <div className={styles.ratingStage}>
          <div className={styles.bigRating}>
            {typeof effectiveRating === 'number'
              ? t('modal.rating.ratingValue', { n: effectiveRating })
              : t('modal.rating.notRated')}
          </div>

          <div
            className={styles.starRow}
            onMouseLeave={() => setHoverRating(null)}
          >
            {Array.from({ length: 5 }, (_, index) => {
              const starIndex = index + 1;
              const state = buildStarState(effectiveRating, starIndex);
              const StarIcon = state === 'half' ? StarHalf : Star;
              const filled = state !== 'empty';
              return (
                <span key={starIndex} className={styles.starWrap}>
                  <StarIcon
                    size={32}
                    strokeWidth={1.5}
                    className={`${styles.starIcon} ${filled ? styles.starFilled : ''}`}
                    fill={filled ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className={styles.starHitLeft}
                    aria-label={t('modal.rating.starLabel', { value: starIndex - 0.5 })}
                    onMouseEnter={() => setHoverRating(starIndex - 0.5)}
                    onClick={() => setRating(starIndex - 0.5)}
                  />
                  <button
                    type="button"
                    className={styles.starHitRight}
                    aria-label={t('modal.rating.starLabel', { value: starIndex })}
                    onMouseEnter={() => setHoverRating(starIndex)}
                    onClick={() => setRating(starIndex)}
                  />
                </span>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.clearRating}
            onClick={() => {
              setRating(null);
              setHoverRating(null);
            }}
            disabled={rating === null}
          >
            {t('modal.rating.clearRating')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default translate(RatingModal);
