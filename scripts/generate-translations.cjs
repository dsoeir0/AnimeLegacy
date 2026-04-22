/* eslint-disable no-console */

//
//  generate-translations.cjs
//
//  Keeps the per-language JSON files under /lang in sync with en.json.
//  Uses MyMemory (https://mymemory.translated.net/doc/spec.php):
//    • 5 000 words/day for anonymous IP
//    • 50 000 words/day if you set MYMEMORY_EMAIL in .env.local
//    • No API key, no credit card, no SDK
//
//  Run with:  pnpm gen-trans
//

require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env

const fs = require('fs').promises;
const path = require('path');

/* ───────────── configuration ───────────── */

const SRC_DIR = path.resolve(__dirname, '../lang');
const EN_FILE = path.join(SRC_DIR, 'en.json');
const API_ENDPOINT = 'https://api.mymemory.translated.net/get';

// Map our app language codes to MyMemory target codes.
// MyMemory accepts both 2-letter (en, pt, es, fr) and locale (pt-PT, es-ES, fr-FR).
// We request pt-PT explicitly for European Portuguese (not pt-BR).
const LOCALE_TO_MYMEM = {
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
};

const LOCALES = Object.keys(LOCALE_TO_MYMEM);
const SOURCE_LANG = 'en-US';
const REQUEST_DELAY_MS = 120; // be polite — ~8 req/sec max
const MAX_RETRIES = 3;        // per-request retries on transient errors
const QUOTA_BAILOUT_THRESHOLD = 8; // consecutive 429s → assume daily quota is gone

/* ───────────── helpers ───────────── */

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
      // Transient burst rate-limit: back off and retry. If it persists across
      // all retries, caller escalates via the consecutive-429 counter.
      const wait = 1500 * Math.pow(2, attempt); // 1.5s → 3s → 6s
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

/**
 * Recursively walks the EN object in insertion order, copies valid existing
 * translations, translates missing ones, and omits any key not in EN.
 * `state` tracks consecutive-429s across the whole run so we can bail early
 * when the daily quota is clearly exhausted.
 */
async function recurseTranslate(enObj, existing, target, state, trace = []) {
  const out = Array.isArray(enObj) ? [] : {};

  for (const [key, value] of Object.entries(enObj)) {
    const prev = existing && Object.prototype.hasOwnProperty.call(existing, key)
      ? existing[key]
      : undefined;
    const nextPath = [...trace, key];

    if (typeof value === 'string') {
      if (prev && String(prev).trim() !== '') {
        out[key] = prev; // keep existing good translation
      } else if (value.trim() !== '') {
        if (state.quotaGone) {
          // skip silently — omitting the key makes the summary accurately
          // report it as missing so the next run retries it
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
          // omit the key (don't assign out[key]) so it retries next run
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

/* ───────────── main ───────────── */

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

  /* 1️⃣  translate / merge / clean-up */
  const state = { consecutive429: 0, quotaGone: false };
  for (const locale of LOCALES) {
    const target = LOCALE_TO_MYMEM[locale];
    console.log(`\n→ Translating missing keys into ${locale} (${target})…`);
    const file = path.join(SRC_DIR, `${locale}.json`);
    const previous = (await loadJSON(file)) || {};
    const aligned = await recurseTranslate(en, previous, target, state);
    await saveJSON(file, aligned);
  }

  /* 2️⃣  summary comparison */
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
