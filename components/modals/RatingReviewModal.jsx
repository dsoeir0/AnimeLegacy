import { useEffect, useState } from 'react';
import { Check, Circle, Star, StarHalf, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from '../../styles/add-to-list.module.css';

const buildStarState = (rating, starIndex) => {
  const fullValue = starIndex;
  const halfValue = starIndex - 0.5;
  if (typeof rating !== 'number') return 'empty';
  if (rating >= fullValue) return 'full';
  if (rating >= halfValue) return 'half';
  return 'empty';
};

function RatingReviewModal({
  open,
  anime,
  initialRating,
  initialReview,
  onClose,
  onSave,
  t,
}) {
  const [rating, setRating] = useState(null);
  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const hasExistingData =
    typeof initialRating === 'number' || (typeof initialReview === 'string' && initialReview.trim().length > 0);

  useEffect(() => {
    if (!open) return;
    const nextRating = typeof initialRating === 'number' ? initialRating : null;
    const nextReview = typeof initialReview === 'string' ? initialReview : '';
    setRating(nextRating);
    setReviewText(nextReview);
    setReviewEnabled(Boolean(nextReview));
  }, [open, initialRating, initialReview]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>{t('modal.rating.title')}</div>
            <h2 className={styles.title}>{anime?.title || 'Untitled'}</h2>
            <div className={styles.metaRow}>
              <span>{anime?.type || t('modal.addToList.typeFallback')}</span>
              <span>•</span>
              <span>
                {anime?.episodes
                  ? t('modal.addToList.episodesShort', { n: anime.episodes })
                  : t('modal.addToList.ongoing')}
              </span>
            </div>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label={t('actions.close')}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.posterWrap}>
            <div className={styles.poster}>
              {anime?.image ? (
                <img src={anime.image} alt={anime?.title || 'Anime poster'} />
              ) : (
                <div className={styles.posterFallback} />
              )}
            </div>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>{t('modal.rating.yourRating')}</label>
              <div className={styles.reviewBlock}>
                <div className={styles.starRow}>
                  {Array.from({ length: 5 }, (_, index) => {
                    const starIndex = index + 1;
                    const starState = buildStarState(rating, starIndex);
                    const StarIcon = starState === 'half' ? StarHalf : Star;
                    const filled = starState !== 'empty';
                    return (
                      <span key={starIndex} className={styles.starWrap}>
                        <StarIcon
                          size={20}
                          strokeWidth={1.5}
                          fill={filled ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          className={styles.starHitLeft}
                          aria-label={t('modal.rating.starLabel', { value: starIndex - 0.5 })}
                          onClick={() => setRating(starIndex - 0.5)}
                        />
                        <button
                          type="button"
                          className={styles.starHitRight}
                          aria-label={t('modal.rating.starLabel', { value: starIndex })}
                          onClick={() => setRating(starIndex)}
                        />
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    className={styles.clearRating}
                    onClick={() => setRating(null)}
                  >
                    {t('actions.clear')}
                  </button>
                  <span className={styles.ratingValue}>
                    {typeof rating === 'number'
                      ? t('modal.rating.ratingValue', { n: rating })
                      : t('modal.rating.notRated')}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('modal.rating.review')}</label>
              <div className={styles.reviewToggleRow}>
                <button
                  type="button"
                  className={`${styles.reviewToggle} ${reviewEnabled ? styles.reviewToggleActive : ''}`}
                  aria-pressed={reviewEnabled}
                  onClick={() => setReviewEnabled((prev) => !prev)}
                >
                  {reviewEnabled ? (
                    <Check size={14} className={styles.reviewToggleIcon} aria-hidden="true" />
                  ) : (
                    <Circle size={14} className={styles.reviewToggleIcon} aria-hidden="true" />
                  )}
                  <span>
                    {reviewEnabled ? t('modal.rating.reviewEnabled') : t('modal.rating.enableReview')}
                  </span>
                </button>
              </div>
              {reviewEnabled ? (
                <textarea
                  className={styles.reviewTextarea}
                  placeholder={t('modal.rating.reviewPlaceholder')}
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            className={styles.primary}
            type="button"
            onClick={() => {
              const nextReview = reviewEnabled ? reviewText.trim() : '';
              onSave({
                rating: typeof rating === 'number' ? rating : null,
                review: nextReview,
              });
            }}
          >
            {hasExistingData ? t('modal.rating.update') : t('modal.rating.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default translate(RatingReviewModal);
