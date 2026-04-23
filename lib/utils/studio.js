// Pure helpers shared by the studios index, the studio detail page, and the
// `/api/studio-posters` proxy. Extracted to keep the producer-role
// classification logic in one place — the /studios page relies on it in two
// different call sites (SSR for the featured studio + client-side for the
// grid) so a drift between them would re-introduce the "FMA: Brotherhood
// appears on both Bones's and Aniplex's cards" bug.

// Picks the canonical name for a Jikan producer entry. Jikan stores names
// as a `titles` array with a `type` discriminator; the "Default" entry is
// what MAL shows in its UI. Falls back to the first title then to `name`
// for very old entries that might predate the titles array.
export const pickStudioName = (producer) => {
  if (!producer) return 'Unknown';
  const titles = Array.isArray(producer.titles) ? producer.titles : [];
  const preferred = titles.find((title) => title?.type === 'Default') || titles[0];
  return preferred?.title || producer.name || 'Unknown';
};

// Single-letter logo used by the "Studio in focus" block (64px tile).
export const studioInitial = (name) => {
  const letter = String(name || '?').trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
};

// Two-letter logo used by the grid cards (46px tile).
export const studioInitials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

// Jikan's `/anime?producers={id}` endpoint matches the studios, producers,
// and licensors roles as a single flat filter — a single entity can appear
// in all three for the same anime. For /studios we want to attribute each
// anime to the entity's actual role: if the entity is in `anime.studios[]`
// for at least one hit, treat it as an animation studio and filter to
// studio-role matches only. Otherwise fall back to producer-role matches so
// pure financiers (Aniplex, TV Tokyo, Shueisha, …) still show their real
// catalogue instead of an empty list.
//
// Returns `{ role, matches }` where role is either `'studio'` or
// `'producer'` and `matches` is the filtered subset. `list` must be a raw
// array of Jikan anime objects (each with optional `studios`/`producers`
// arrays of `{mal_id, …}`).
export const classifyProducerRole = (list, producerId) => {
  const id = Number(producerId);
  if (!Number.isFinite(id) || id <= 0 || !Array.isArray(list)) {
    return { role: 'producer', matches: [] };
  }
  const asStudio = list.filter(
    (a) =>
      Array.isArray(a?.studios) &&
      a.studios.some((s) => Number(s?.mal_id) === id),
  );
  if (asStudio.length > 0) {
    return { role: 'studio', matches: asStudio };
  }
  const asProducer = list.filter(
    (a) =>
      Array.isArray(a?.producers) &&
      a.producers.some((p) => Number(p?.mal_id) === id),
  );
  return { role: 'producer', matches: asProducer };
};
