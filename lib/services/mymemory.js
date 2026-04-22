// MyMemory HTTP client for on-demand translation.
// Free tier: 5 000 words/day per IP, 50 000/day with MYMEMORY_EMAIL set.
// Each request caps at 500 chars, so callers should translate long text via
// `translateText()`, which chunks on sentence boundaries.

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
const SOURCE_LANG = 'en-US';
const CHUNK_LIMIT = 480;

// App language codes → MyMemory locale codes. Keep in sync with the locales
// supported in /lang. European variants are requested explicitly.
const LANG_TO_MYMEM = {
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
};

export const SUPPORTED_TARGETS = new Set(Object.keys(LANG_TO_MYMEM));

const buildUrl = (text, target) => {
  const params = new URLSearchParams({
    q: text,
    langpair: `${SOURCE_LANG}|${target}`,
  });
  if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL);
  return `${MYMEMORY_ENDPOINT}?${params.toString()}`;
};

// Split text into chunks of at most `maxLen` chars, preferring sentence breaks.
const chunkForTranslation = (text, maxLen = CHUNK_LIMIT) => {
  if (!text) return [];
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let breakAt = -1;
    for (const sep of ['\n\n', '. ', '! ', '? ', '\n', '; ', ', ']) {
      const idx = remaining.lastIndexOf(sep, maxLen);
      if (idx > breakAt) breakAt = idx + sep.length;
    }
    if (breakAt <= 0) {
      breakAt = remaining.lastIndexOf(' ', maxLen);
      if (breakAt <= 0) breakAt = maxLen;
    }
    chunks.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
};

const translateChunk = async (text, target) => {
  const response = await fetch(buildUrl(text, target));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const translated = payload?.responseData?.translatedText;
  if (typeof translated !== 'string' || translated.length === 0) {
    throw new Error(payload?.responseDetails || 'Empty translation');
  }
  if (/^(mymemory|quota|invalid)/i.test(translated)) {
    throw new Error('Quota or provider error');
  }
  return translated;
};

// Translate an arbitrarily-long English string into `lang` (one of pt/es/fr).
// Chunks internally and reassembles. Throws on any chunk failure.
export const translateText = async (text, lang) => {
  const target = LANG_TO_MYMEM[lang];
  if (!target) throw new Error(`Unsupported language: ${lang}`);
  const chunks = chunkForTranslation(text);
  const translated = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, target));
  }
  return translated.join('');
};
