const BUCKET_CEILING = 10_000;

export const getClientIp = (req) => {
  const xff = req?.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req?.socket?.remoteAddress || 'unknown';
};

export const createRateLimiter = ({ max, windowMs }) => {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    if (buckets.size > BUCKET_CEILING) {
      for (const [k, b] of buckets) {
        if (now - b.start > windowMs) buckets.delete(k);
      }
    }
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      buckets.set(key, { count: 1, start: now });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (bucket.count >= max) {
      return { allowed: false, retryAfterMs: windowMs - (now - bucket.start) };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  };
};

export const guardApiRoute = (req, res, limiter) => {
  const { allowed, retryAfterMs } = limiter(getClientIp(req));
  if (!allowed) {
    res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  return true;
};
