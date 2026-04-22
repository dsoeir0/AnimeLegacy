import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Minus, Plus, Star, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { isAiringAnime } from '../../lib/utils/anime';
import { getSeasonFromDate } from '../../lib/utils/season';
import { FAVORITE_LIMIT } from '../../lib/constants';
import styles from '../../styles/add-to-list.module.css';

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
    const defaultStatus = initialStatus || 'plan';
    const sanitizedStatus =
      isAiring && defaultStatus === 'completed' ? 'watching' : defaultStatus;
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

  if (!open) return null;

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

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>
              {isEditing ? t('modal.addToList.titleEdit') : t('modal.addToList.titleAdd')}
            </div>
            <h2 className={styles.title}>{anime?.title || 'Untitled'}</h2>
            <div className={styles.metaRow}>
              <span>{anime?.type || t('modal.addToList.typeFallback')}</span>
              <span>•</span>
              <span>
                {totalEpisodes
                  ? t('modal.addToList.episodesShort', { n: totalEpisodes })
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
            <div
              className={`${styles.badge} ${isCompleted ? styles.badgeCompleted : ''}`}
            >
              {(() => {
                const opt = statusOptions.find((option) => option.value === status);
                return opt ? t(opt.labelKey) : '';
              })()}
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
                  {(() => {
                    const opt = statusOptions.find((option) => option.value === status);
                    return opt ? t(opt.labelKey) : '';
                  })()}
                  <ChevronDown size={14} className={styles.selectCaretIcon} aria-hidden="true" />
                </button>
                {statusOpen ? (
                  <div className={styles.selectMenu} role="listbox">
                    {statusOptions.map((option) => {
                      const isDisabled = isAiring && option.value === 'completed';
                      return (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.selectOption} ${status === option.value ? styles.selectOptionActive : ''} ${isDisabled ? styles.selectOptionDisabled : ''}`}
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
                        {t(option.labelKey)}
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

        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            className={styles.primary}
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
                status: isAiring && status === 'completed' ? 'watching' : status,
                progress: progressValue,
                episodesTotal: totalEpisodes,
                isFavorite: status === 'completed' ? isFavorite : false,
              });
            }}
          >
            {isEditing ? t('modal.addToList.ctaSave') : t('modal.addToList.ctaAdd')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default translate(AddToListModal);




