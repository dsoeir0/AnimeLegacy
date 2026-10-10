// AniList rate-limits per IP and every server-side AniList caller shares that
// budget, so they share one backoff: after a 429 nobody calls until
// Retry-After has passed.

let blockedUntil = 0;

export const isAniListBlocked = () => Date.now() < blockedUntil;

export const noteAniListRateLimit = (response) => {
  if (response?.status !== 429) return false;
  const retryAfter = Number(response.headers?.get?.('retry-after'));
  blockedUntil = Date.now() + (retryAfter > 0 ? retryAfter : 60) * 1000;
  return true;
};
