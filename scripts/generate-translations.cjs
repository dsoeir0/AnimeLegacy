/* eslint-disable no-console */

//
//  generate-translations.cjs
//
//  Keeps the per-language JSON files under /lang in sync with en.json.
//  Based on the implementation used in the On-Route web project.
//
//  ┌─────────────── credentials ────────────────┐
//  │ Make sure in your .env file you have:      │
//  │                                            │
//  │ 1) Plain API key (works too, quotas apply) │
//  │    GOOGLE_TRANSLATE_API_KEY=AIza…          │
//  └────────────────────────────────────────────┘
//
//  Run with:  npm run gen-trans
//

require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local is missing

const fs = require('fs').promises;
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;

/* ───────────── configuration ───────────── */

const SRC_DIR = path.resolve(__dirname, '../lang');
const EN_FILE = path.join(SRC_DIR, 'en.json');

// AnimeLegacy supports only four languages today. If you add more,
// drop a `<code>.json` file in /lang and list the code here.
const LOCALES = ['pt', 'es', 'fr'];

/* ───────────── helpers ───────────── */

function getTranslator() {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) {
    console.error('❌  Missing GOOGLE_TRANSLATE_API_KEY in .env.local or .env');
    process.exit(1);
  }
  return new Translate({ key });
}

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

async function translateText(translator, text, target) {
  const [translated] = await translator.translate(text, target);
  return translated;
}

/**
 * Recursively walks the EN object in insertion order, copies valid existing
 * translations, translates missing ones, and omits any key not in EN.
 */
async function recurseTranslate(translator, enObj, existing, locale, trace = []) {
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
        try {
          out[key] = await translateText(translator, value, locale);
          console.log(`[${locale}] ${nextPath.join('.')} → ${out[key]}`);
        } catch (err) {
          console.warn(`⚠  ${locale}:${nextPath.join('.')} skipped (${err.message})`);
        }
      } else {
        out[key] = '';
      }
    } else if (value && typeof value === 'object') {
      const child = await recurseTranslate(translator, value, prev, locale, nextPath);
      if (Object.keys(child).length) out[key] = child;
    } else {
      out[key] = value; // numbers / booleans
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
  const translator = getTranslator();

  const en = await loadJSON(EN_FILE);
  if (!en) {
    console.error(`❌  Cannot read ${EN_FILE}`);
    process.exit(1);
  }

  /* 1️⃣  translate / merge / clean-up */
  for (const locale of LOCALES) {
    console.log(`\n→ Translating missing keys into ${locale}…`);
    const file = path.join(SRC_DIR, `${locale}.json`);
    const previous = (await loadJSON(file)) || {};
    const aligned = await recurseTranslate(translator, en, previous, locale);
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
