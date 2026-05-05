import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Minus, Plus, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Modal from './Modal';
import modalStyles from './Modal.module.css';
import { isAiringAnime } from '../../lib/utils/anime';
import { getSeasonFromDate } from '../../lib/utils/season';
import { resolveStatus } from '../../lib/utils/listTransitions';
import { FAVORITE_LIMIT } from '../../lib/constants';
import styles from './AddToListModal.module.css';

const statusOptions = [
  { value: 'plan', labelKey: 'modal.addToList.statusPlan' },
  { value: 'watching', labelKey: 'modal.addToList.statusWatching' },
  { value: 'completed', labelKey: 'modal.addToList.statusCompleted' },
  { value: 'on_hold', labelKey: 'modal.addToList.statusOnHold' },
  { value: 'dropped', labelKey: 'modal.addToList.statusDropped' },
];

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (Number.isFinite(max)) return Math.min(Math.max(value, min), max);
  return Math.max(value, min);
};

function AddToListModal({
  open,
  anime,
  onClose,
  onConfirm,
  airingOverride,
  initialStatus,
  initialProgress,
  initialFavorite,
  favoriteCount = 0,
  isEditing = false,
  t,
}) {
  const isAiring = useMemo(() => {
    if (typeof airingOverride === 'boolean') return airingOverride;
    const seasonLabel = String(anime?.season ?? '').toLowerCase();
    const currentSeason = getSeasonFromDate();
    const currentYear = new Date().getFullYear();
    const typeLabel = String(anime?.type ?? '').toLowerCase();
    const seasonHeuristic =
      Boolean(seasonLabel) &&
      Number(anime?.year) === currentYear &&
      seasonLabel === currentSeason &&
      typeLabel.includes('tv');
    const yearHeuristic = Number(anime?.year) === currentYear && typeLabel.includes('tv');
    return isAiringAnime(anime) || seasonHeuristic || yearHeuristic;
  }, [airingOverride, anime]);
  const totalEpisodes = useMemo(() => {
    const total = anime?.episodes ?? anime?.episodesTotal ?? null;
    return Number.isFinite(total) && total > 0 ? total : null;
  }, [anime]);
  const [status, setStatus] = useState('plan');
  const [progress, setProgress] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [airingCompletionWarning, setAiringCompletionWarning] = useState('');
  const statusRootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const sanitizedStatus = resolveStatus(initialStatus, isAiring);
    const baseProgress = Number.isFinite(initialProgress) ? initialProgress : 0;
    setStatus(sanitizedStatus);
    setIsFavorite(Boolean(initialFavorite));
    const nextProgress =
      sanitizedStatus === 'completed' && totalEpisodes ? totalEpisodes : baseProgress;
    const effectiveMax =
      isAiring && totalEpisodes ? Math.max(totalEpisodes - 1, 0) : totalEpisodes ?? undefined;
    setProgress(clamp(nextProgress, 0, effectiveMax));
    setAiringCompletionWarning('');
  }, [open, totalEpisodes, initialProgress, initialStatus, initialFavorite, isAiring]);

  useEffect(() => {
    if (!totalEpisodes || isAiring) return;
    if (status === 'watching' && progress >= totalEpisodes) {
      setStatus('completed');
      return;
    }
    if (status === 'completed' && progress < totalEpisodes) {
      setStatus('watching');
    }
  }, [progress, status, totalEpisodes, isAiring]);

  useEffect(() => {
    if (status === 'completed') return;
    if (isFavorite) setIsFavorite(false);
  }, [status, isFavorite]);

  useEffect(() => {
    if (!statusOpen) return undefined;
    const handleOutside = (event) => {
      if (!statusRootRef.current) return;
      if (!statusRootRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [statusOpen]);

  const maxProgress =
    isAiring && totalEpisodes ? Math.max(totalEpisodes - 1, 0) : totalEpisodes ?? undefined;
  const progressValue = clamp(progress, 0, maxProgress);
  const isCompleted = status === 'completed';
  const favoriteLimitReached = favoriteCount >= FAVORITE_LIMIT && !initialFavorite;
  const progressPercent = totalEpisodes
    ? Math.min(100, Math.round((progressValue / totalEpisodes) * 100))
    : null;
  const shouldWarnAiringCompletion =
    isAiring && (status === 'completed' || (totalEpisodes && progressValue >= totalEpisodes));
  const activeOption = statusOptions.find((option) => option.value === status);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="addtolist-modal-title"
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
            onClick={() => {
              const tryingToComplete =
                status === 'completed' || (totalEpisodes && progressValue >= totalEpisodes);
              if (isAiring && tryingToComplete) {
                setAiringCompletionWarning(t('modal.addToList.airingWarning'));
                return;
              }
              setAiringCompletionWarning('');
              onConfirm({
                status: resolveStatus(status, isAiring),
                progress: progressValue,
                episodesTotal: totalEpisodes,
                isFavorite: status === 'completed' ? isFavorite : false,
              });
            }}
          >
            {isEditing ? t('modal.addToList.ctaSave') : t('modal.addToList.ctaAdd')}
          </button>
        </>
      }
    >
      <div className={styles.head}>
        <div className={styles.eyebrow}>
          {isEditing ? t('modal.addToList.titleEdit') : t('modal.addToList.titleAdd')}
        </div>
        <h2 id="addtolist-modal-title" className={styles.title}>
          {anime?.title || 'Untitled'}
        </h2>
        <div className={styles.metaRow}>
          <span>{anime?.type || t('modal.addToList.typeFallback')}</span>
          <span className={styles.metaDot} aria-hidden="true">·</span>
          <span>
            {totalEpisodes
              ? t('modal.addToList.episodesShort', { n: totalEpisodes })
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
          <div className={`${styles.badge} ${isCompleted ? styles.badgeCompleted : ''}`}>
            {activeOption ? t(activeOption.labelKey) : ''}
          </div>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="status-select">
              {t('modal.addToList.currentStatus')}
            </label>
            <div className={styles.selectRoot} ref={statusRootRef}>
              <button
                id="status-select"
                type="button"
                className={styles.selectButton}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((prev) => !prev)}
              >
                {activeOption ? t(activeOption.labelKey) : ''}
                <ChevronDown size={14} className={styles.selectCaret} aria-hidden="true" />
              </button>
              {statusOpen ? (
                <div className={styles.selectMenu} role="listbox">
                  {statusOptions.map((option) => {
                    const isDisabled = isAiring && option.value === 'completed';
                    const isActive = status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.selectOption} ${isActive ? styles.selectOptionActive : ''} ${isDisabled ? styles.selectOptionDisabled : ''}`}
                        aria-disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) {
                            setAiringCompletionWarning(t('modal.addToList.airingWarning'));
                            setStatusOpen(false);
                            return;
                          }
                          setAiringCompletionWarning('');
                          setStatus(option.value);
                          if (option.value === 'completed' && totalEpisodes) {
                            setProgress(totalEpisodes);
                          }
                          setStatusOpen(false);
                        }}
                      >
                        <span>{t(option.labelKey)}</span>
                        {isActive ? (
                          <Check
                            size={14}
                            className={styles.selectOptionCheck}
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {airingCompletionWarning || shouldWarnAiringCompletion ? (
              <div className={styles.warning} role="status" aria-live="polite">
                <AlertTriangle size={14} className={styles.warningIcon} aria-hidden="true" />
                <span>{airingCompletionWarning || t('modal.addToList.airingWarning')}</span>
              </div>
            ) : null}
          </div>

          {status === 'plan' ? null : (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="progress-input">
                {t('modal.addToList.episodesWatched')}
              </label>
              <div className={styles.progressRow}>
                <button
                  type="button"
                  className={styles.stepButton}
                  onClick={() => setProgress((prev) => clamp(prev - 1, 0, maxProgress))}
                  aria-label={t('modal.addToList.decreaseEp')}
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <input
                  id="progress-input"
                  className={styles.progressInput}
                  type="number"
                  min={0}
                  max={maxProgress}
                  inputMode="numeric"
                  value={progressValue}
                  onChange={(event) =>
                    setProgress(clamp(Number(event.target.value), 0, maxProgress))
                  }
                />
                <button
                  type="button"
                  className={styles.stepButton}
                  onClick={() => setProgress((prev) => clamp(prev + 1, 0, maxProgress))}
                  aria-label={t('modal.addToList.increaseEp')}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
                <span className={styles.progressMeta}>
                  {totalEpisodes
                    ? t('modal.addToList.progressOf', { n: totalEpisodes })
                    : t('modal.addToList.progressUnknown')}
                </span>
              </div>
              {totalEpisodes ? (
                <div className={styles.progressBar} aria-hidden="true">
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              ) : null}
              <p className={styles.helper}>
                {totalEpisodes
                  ? t('modal.addToList.progressHelperKnown')
                  : t('modal.addToList.progressHelperUnknown')}
              </p>
            </div>
          )}

          {status === 'completed' ? (
            <div className={styles.field}>
              <label className={styles.label}>{t('modal.addToList.favoriteLabel')}</label>
              <button
                type="button"
                className={`${styles.favoriteToggle} ${isFavorite ? styles.favoriteToggleActive : ''}`}
                aria-pressed={isFavorite}
                onClick={() => setIsFavorite((prev) => !prev)}
                disabled={favoriteLimitReached}
              >
                <Star
                  size={14}
                  className={styles.favoriteIcon}
                  fill={isFavorite ? 'currentColor' : 'none'}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>
                  {isFavorite
                    ? t('modal.addToList.favoriteMarked')
                    : t('modal.addToList.favoriteMark')}
                </span>
              </button>
              <p className={styles.helper}>
                {favoriteLimitReached
                  ? t('errors.favoriteLimitAnime', { limit: FAVORITE_LIMIT })
                  : t('modal.addToList.favoriteHint')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export default translate(AddToListModal);
