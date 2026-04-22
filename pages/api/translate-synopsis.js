import { SUPPORTED_TARGETS, translateText } from '../../lib/services/mymemory';

const MAX_INPUT_LENGTH = 4000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
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
    return res.status(502).json({ error: err?.message || 'Translation failed' });
  }
}
