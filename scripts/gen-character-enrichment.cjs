const fs = require('fs').promises;
const path = require('path');

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const OUT_FILE = path.resolve(__dirname, '../lib/data/characterEnrichment.json');
const PAGES = [1, 2];
const REQUEST_DELAY_MS = 360;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isHentai = (anime) => {
  const genres = Array.isArray(anime?.genres) ? anime.genres : [];
  const explicit = Array.isArray(anime?.explicit_genres) ? anime.explicit_genres : [];
  return [...genres, ...explicit].some((g) => {
    const name = (typeof g === 'string' ? g : g?.name || '').toLowerCase();
    return name === 'hentai' || name === 'erotica';
  });
};

const pickPrincipalRole = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries.find((e) => e?.role === 'Main') || entries[0];
};

const pickPrincipalVoice = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries.find((v) => v?.language === 'Japanese') || entries[0];
};

async function fetchJikan(pathname) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(`${JIKAN_BASE}${pathname}`);
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** attempt);
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      await sleep(800 * 2 ** attempt);
    }
  }
  return null;
}

async function enrichOne(id) {
  const animeRes = await fetchJikan(`/characters/${id}/anime`);
  await sleep(REQUEST_DELAY_MS);
  const voicesRes = await fetchJikan(`/characters/${id}/voices`);
  await sleep(REQUEST_DELAY_MS);

  const animeList = (Array.isArray(animeRes?.data) ? animeRes.data : []).filter(
    (e) => !isHentai(e?.anime),
  );
  const principal = pickPrincipalRole(animeList);
  const voice = pickPrincipalVoice(Array.isArray(voicesRes?.data) ? voicesRes.data : []);

  return {
    id,
    role: principal?.role || null,
    animeTitle: principal?.anime?.title || null,
    voiceActor: voice?.person
      ? {
          name: voice.person.name || null,
          image:
            voice.person.images?.jpg?.image_url ||
            voice.person.images?.webp?.image_url ||
            null,
        }
      : null,
  };
}

async function main() {
  const basics = [];
  for (const page of PAGES) {
    const res = await fetchJikan(`/top/characters?page=${page}`);
    const data = Array.isArray(res?.data) ? res.data : [];
    for (const c of data) {
      if (!c?.mal_id) continue;
      basics.push({
        mal_id: c.mal_id,
        name: c.name || '',
        name_kanji: c.name_kanji || '',
        images: c.images || null,
        favorites: typeof c.favorites === 'number' ? c.favorites : null,
      });
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const out = {};
  let done = 0;
  for (const basic of basics) {
    const entry = await enrichOne(basic.mal_id);
    out[basic.mal_id] = {
      mal_id: basic.mal_id,
      name: basic.name,
      name_kanji: basic.name_kanji,
      images: basic.images,
      favorites: basic.favorites,
      role: entry.role,
      animeTitle: entry.animeTitle,
      voiceActor: entry.voiceActor,
    };
    done += 1;
    process.stdout.write(`\r  enriched ${done}/${basics.length}`);
  }
  process.stdout.write('\n');

  await fs.writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(out).length} entries to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
