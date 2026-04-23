import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Modal from './Modal';
import modalStyles from './Modal.module.css';
import styles from './ReviewModal.module.css';

const MAX_CHARS = 2000;

function ReviewModal({ open, anime, initialReview, onClose, onSave, t }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    setText(typeof initialReview === 'string' ? initialReview : '');
  }, [open, initialReview]);

  const hasExisting =
    typeof initialReview === 'string' && initialReview.trim().length > 0;
  const trimmed = useMemo(() => text.trim(), [text]);
  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;
  const saveDisabled = overLimit || (!trimmed && !hasExisting);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="review-modal-title"
      backdropImage={anime?.banner || anime?.image || null}
      closeLabel={t('actions.close')}
      footer={
        <>
          {hasExisting ? (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => onSave({ review: '' })}
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>{t('modal.review.deleteReview')}</span>
            </button>
          ) : null}
          <button className={modalStyles.btnSecondary} type="button" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            className={modalStyles.btnPrimary}
            type="button"
            disabled={saveDisabled}
            onClick={() => onSave({ review: trimmed })}
          >
            {hasExisting ? t('modal.review.update') : t('modal.review.save')}
          </button>
        </>
      }
    >
      <div className={styles.head}>
        <div className={styles.eyebrow}>{t('modal.review.title')}</div>
        <h2 id="review-modal-title" className={styles.title}>
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
        <textarea
          className={`${styles.textarea} ${overLimit ? styles.textareaOver : ''}`}
          placeholder={t('modal.review.placeholder')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          autoFocus
        />
        <div className={styles.helperRow}>
          <span className={styles.helper}>{t('modal.review.hint')}</span>
          <span className={`${styles.charCount} ${overLimit ? styles.charCountOver : ''}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default translate(ReviewModal);
