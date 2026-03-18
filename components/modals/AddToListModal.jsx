import { useEffect, useMemo, useRef, useState } from 'react';
import { isAiringAnime } from '../../lib/utils/anime';
import { getSeasonFromDate } from '../../lib/utils/season';
import styles from '../../styles/add-to-list.module.css';

const statusOptions = [
  { value: 'plan', label: 'Plan to Watch' },
  { value: 'watching', label: 'Currently Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (Number.isFinite(max)) return Math.min(Math.max(value, min), max);
  return Math.max(value, min);
};

export default function AddToListModal({
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
  const favoriteLimit = 10;
  const favoriteLimitReached = favoriteCount >= favoriteLimit && !initialFavorite;
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
            <div className={styles.eyebrow}>{isEditing ? 'Edit Entry' : 'Add to List'}</div>
            <h2 className={styles.title}>{anime?.title || 'Untitled'}</h2>
            <div className={styles.metaRow}>
              <span>{anime?.type || 'Series'}</span>
              <span>•</span>
              <span>{totalEpisodes ? `${totalEpisodes} eps` : 'Ongoing'}</span>
            </div>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Close">
            <i className={`bi bi-x-lg ${styles.icon}`} aria-hidden="true" />
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
              {statusOptions.find((option) => option.value === status)?.label}
            </div>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="status-select">
                Current status
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
                  {statusOptions.find((option) => option.value === status)?.label}
                  <i className={`bi bi-chevron-down ${styles.selectCaretIcon}`} aria-hidden="true" />
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
                            setAiringCompletionWarning(
                              'This title is still airing, so it cannot be marked as Completed yet.',
                            );
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
                        {option.label}
                      </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {airingCompletionWarning || shouldWarnAiringCompletion ? (
                <div className={styles.warning} role="status" aria-live="polite">
                  <i className={`bi bi-exclamation-triangle ${styles.warningIcon}`} aria-hidden="true" />
                  <span>
                    {airingCompletionWarning ||
                      'This title is still airing, so it cannot be marked as Completed yet.'}
                  </span>
                </div>
              ) : null}
            </div>

            {status === 'plan' ? null : (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="progress-input">
                  Episodes watched
                </label>
                <div className={styles.progressRow}>
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => setProgress((prev) => clamp(prev - 1, 0, maxProgress))}
                    aria-label="Decrease episodes watched"
                  >
                    <i className={`bi bi-dash ${styles.icon}`} aria-hidden="true" />
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
                    aria-label="Increase episodes watched"
                  >
                    <i className={`bi bi-plus ${styles.icon}`} aria-hidden="true" />
                  </button>
                  <span className={styles.progressMeta}>
                    {totalEpisodes ? `of ${totalEpisodes}` : 'of ?'}
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
                    ? 'Progress is capped by total episodes.'
                    : 'Total episodes unknown. You can update this later.'}
                </p>
              </div>
            )}
            {status === 'completed' ? (
              <div className={styles.field}>
                <label className={styles.label}>Favorite</label>
                <button
                  type="button"
                  className={`${styles.favoriteToggle} ${isFavorite ? styles.favoriteToggleActive : ''}`}
                  aria-pressed={isFavorite}
                  onClick={() => setIsFavorite((prev) => !prev)}
                  disabled={favoriteLimitReached}
                >
                  <i
                    className={`bi ${isFavorite ? 'bi-star-fill' : 'bi-star'} ${styles.favoriteIcon}`}
                    aria-hidden="true"
                  />
                  <span>{isFavorite ? 'Marked as favorite' : 'Mark as favorite'}</span>
                </button>
                <p className={styles.helper}>
                  {favoriteLimitReached
                    ? 'You already have 10 favorites. Remove one to add another.'
                    : 'Favorites appear on your profile.'}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.primary}
            type="button"
            onClick={() => {
              const tryingToComplete =
                status === 'completed' || (totalEpisodes && progressValue >= totalEpisodes);
              if (isAiring && tryingToComplete) {
                setAiringCompletionWarning(
                  'This title is still airing, so it cannot be marked as Completed yet.',
                );
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
            {isEditing ? 'Save changes' : 'Add to List'}
          </button>
        </div>
      </div>
    </div>
  );
}




