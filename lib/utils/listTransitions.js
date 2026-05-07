import { FAVORITE_LIMIT } from '../constants';

export const REVIEWABLE_STATUSES = ['watching', 'completed', 'on_hold', 'dropped'];
const REVIEWABLE_SET = new Set(REVIEWABLE_STATUSES);
export const canReviewStatus = (status) => REVIEWABLE_SET.has(status);

export const resolveStatus = (rawStatus, isAiring) => {
  const status = rawStatus || 'plan';
  if (isAiring && status === 'completed') return 'watching';
  return status;
};

export const clampProgress = (progressInput, maxProgress) => {
  const progress = Number.isFinite(progressInput) ? progressInput : 0;
  const max = Number.isFinite(maxProgress) ? maxProgress : undefined;
  if (progress < 0) return 0;
  if (Number.isFinite(max) && progress > max) return max;
  return progress;
};

export const resolveFavorite = ({
  desired,
  current,
  currentCount,
  limit = FAVORITE_LIMIT,
}) => {
  if (!desired) return false;
  if (current) return true;
  return currentCount < limit;
};

const STATUS_LABELS = {
  plan: 'Planned to watch',
  completed: 'Marked as completed',
  dropped: 'Dropped',
  on_hold: 'On hold',
};

const watchingLabel = (progress, totalEpisodes) => {
  if (progress > 0) {
    return `Watching (${progress}/${totalEpisodes || 'TBA'})`;
  }
  return 'Started watching';
};

export const deriveActivityLabel = ({
  prev = {},
  next,
  totalEpisodes,
}) => {
  const previousStatus = prev.status || 'plan';
  const previousProgress = typeof prev.progress === 'number' ? prev.progress : 0;
  const previousRating = typeof prev.rating === 'number' ? prev.rating : null;
  const previousReview =
    typeof prev.review === 'string' ? prev.review.trim() : '';

  const nextStatusLabel =
    next.status === 'watching'
      ? watchingLabel(next.progress, totalEpisodes)
      : STATUS_LABELS[next.status] || 'Updated status';

  const parts = [];

  if (next.status !== previousStatus) {
    parts.push(nextStatusLabel);
  } else if (next.progress !== previousProgress && next.status === 'watching') {
    parts.push(
      totalEpisodes
        ? `Watched ${next.progress}/${totalEpisodes}`
        : `Watched ${next.progress} eps`,
    );
  }

  if (next.hasRating && next.rating !== previousRating) {
    if (typeof next.rating === 'number') {
      parts.push(`Rated ${next.rating}/5`);
    } else if (previousRating !== null) {
      parts.push('Cleared rating');
    }
  }

  if (typeof next.review === 'string') {
    const nextReview = next.review.trim();
    if (nextReview !== previousReview) {
      if (nextReview && !previousReview) parts.push('Wrote a review');
      else if (nextReview && previousReview) parts.push('Updated review');
      else if (!nextReview && previousReview) parts.push('Removed review');
    }
  }

  return parts.length ? parts.join(' • ') : nextStatusLabel;
};
