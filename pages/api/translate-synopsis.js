import { SUPPORTED_TARGETS, translateText } from '../../lib/services/mymemory';

const MAX_INPUT_LENGTH = 4000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_BUCKET_CEILING = 10_000;

const ipBuckets = new Map();

const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

const allowRequest = (ip) => {
  const now = Date.now();
  if (ipBuckets.size > RATE_LIMIT_BUCKET_CEILING) {
    for (const [key, bucket] of ipBuckets) {
      if (now - bucket.start > RATE_LIMIT_WINDOW_MS) ipBuckets.delete(key);
    }
  }
  const bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    ipBuckets.set(ip, { count: 1, start: now });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!allowRequest(getClientIp(req))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests' });
  }
  const { text, lang } = req.body || {};
  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing text' });
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return res.status(413).json({ error: 'Text too long' });
  }
  if (!SUPPORTED_TARGETS.has(lang)) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  try {
    const translated = await translateText(text, lang);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ translated });
  } catch (err) {
    console.error('translate-synopsis failed:', err);
    return res.status(502).json({ error: 'Translation failed' });
  }
}
