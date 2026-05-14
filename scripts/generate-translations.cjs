require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../lang');
const EN_FILE = path.join(SRC_DIR, 'en.json');
const API_ENDPOINT = 'https://api.mymemory.translated.net/get';

const LOCALE_TO_MYMEM = {
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
};

const LOCALES = Object.keys(LOCALE_TO_MYMEM);
const SOURCE_LANG = 'en-US';
const REQUEST_DELAY_MS = 120;
const MAX_RETRIES = 3;
const QUOTA_BAILOUT_THRESHOLD = 8;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadJSON(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function saveJSON(file, obj) {
  await fs.writeFile(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function buildUrl(text, target) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${SOURCE_LANG}|${target}`,
  });
  if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL);
  return `${API_ENDPOINT}?${params.toString()}`;
}

async function translateText(text, target) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(buildUrl(text, target));
    if (response.status === 429) {
      const wait = 1500 * Math.pow(2, attempt);
      await sleep(wait);
      lastErr = new Error('HTTP 429');
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const status = payload?.responseStatus;
    const translated = payload?.responseData?.translatedText;
    if (status !== 200 || !translated) {
      if (typeof translated === 'string' && !/^mymemory|quota|invalid/i.test(translated)) {
        return translated;
      }
      throw new Error(payload?.responseDetails || `status ${status}`);
    }
    return translated;
  }
  throw lastErr || new Error('HTTP 429');
}

async function recurseTranslate(enObj, existing, target, state, trace = []) {
  const out = Array.isArray(enObj) ? [] : {};

  for (const [key, value] of Object.entries(enObj)) {
    const prev = existing && Object.prototype.hasOwnProperty.call(existing, key)
      ? existing[key]
      : undefined;
    const nextPath = [...trace, key];

    if (typeof value === 'string') {
      if (prev && String(prev).trim() !== '') {
        out[key] = prev;
      } else if (value.trim() !== '') {
        if (state.quotaGone) {
          continue;
        }
        try {
          await sleep(REQUEST_DELAY_MS);
          out[key] = await translateText(value, target);
          state.consecutive429 = 0;
          console.log(`[${target}] ${nextPath.join('.')} → ${out[key]}`);
        } catch (err) {
          if (err.message === 'HTTP 429') {
            state.consecutive429 += 1;
            if (state.consecutive429 >= QUOTA_BAILOUT_THRESHOLD && !state.quotaGone) {
              state.quotaGone = true;
              console.warn(
                `\n⛔  ${QUOTA_BAILOUT_THRESHOLD} consecutive 429s — daily quota looks exhausted.`,
              );
              console.warn(
                '   Skipping remaining keys. Re-run tomorrow, or set MYMEMORY_EMAIL',
              );
              console.warn(
                '   in .env.local to raise the quota to 50 000 words/day.\n',
              );
            }
          }
          if (!state.quotaGone) {
            console.warn(`⚠  ${target}:${nextPath.join('.')} skipped (${err.message})`);
          }
        }
      } else {
        out[key] = '';
      }
    } else if (value && typeof value === 'object') {
      const child = await recurseTranslate(value, prev, target, state, nextPath);
      if (Object.keys(child).length) out[key] = child;
    } else {
      out[key] = value;
    }
  }

  return out;
}

function listKeys(obj, prefix = '', acc = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      listKeys(v, p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

(async function main() {
  if (typeof fetch !== 'function') {
    console.error('❌  global fetch() is missing — run on Node 18+.');
    process.exit(1);
  }

  if (!process.env.MYMEMORY_EMAIL) {
    console.warn('ℹ️  MYMEMORY_EMAIL not set — using anonymous 5 000 words/day quota.');
    console.warn('   For 50 000 words/day, add MYMEMORY_EMAIL to .env.local.');
  }

  const en = await loadJSON(EN_FILE);
  if (!en) {
    console.error(`❌  Cannot read ${EN_FILE}`);
    process.exit(1);
  }

  const state = { consecutive429: 0, quotaGone: false };
  for (const locale of LOCALES) {
    const target = LOCALE_TO_MYMEM[locale];
    console.log(`\n→ Translating missing keys into ${locale} (${target})…`);
    const file = path.join(SRC_DIR, `${locale}.json`);
    const previous = (await loadJSON(file)) || {};
    const aligned = await recurseTranslate(en, previous, target, state);
    await saveJSON(file, aligned);
  }

  console.log('\n──────── summary check ────────');
  const enKeys = listKeys(en).sort();

  for (const locale of LOCALES) {
    const data = await loadJSON(path.join(SRC_DIR, `${locale}.json`));
    const keys = data ? listKeys(data).sort() : [];
    const missing = enKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !enKeys.includes(k));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✅  ${locale} – perfect match (${keys.length} keys)`);
    } else {
      console.log(`❌  ${locale}`);
      if (missing.length) console.log(`   • missing: ${missing.length}`);
      if (extra.length) console.log(`   • extra  : ${extra.length}`);
    }
  }

  console.log('\n✅  All done.');
})();
