// Deterministic accent-colour palette for studios. Jikan doesn't expose a
// brand colour per producer, but the EstudiosTab design uses a studio
// colour for the accent band, the logo tint, and the "em 2026" stat.
// Rotating through our named-accent tokens by `mal_id % N` gives a stable
// mapping — the same studio always gets the same colour across the session
// (and across deploys).
//
// We use raw hex because the CSS needs per-studio colours at different
// alpha levels (8%, 13%, full) inside `style={}` attributes, where
// `var(--al-warm)` with alpha compositing is ugly. The values below match
// our design tokens exactly so the palette stays in sync with the rest
// of the app.
export const STUDIO_ACCENTS = [
  { base: '#84d9ff', ink: '#84d9ff' }, // primary (cyan)
  { base: '#e8b468', ink: '#f2c37c' }, // warm
  { base: '#7d6bff', ink: '#9a8bff' }, // collection (violet)
  { base: '#3dd68c', ink: '#3dd68c' }, // success
  { base: '#ff6a5b', ink: '#ff8276' }, // danger-ish (softened)
  { base: '#ffb648', ink: '#ffc368' }, // warn
];

export const accentForStudio = (malId) => {
  const id = Number(malId);
  if (!Number.isFinite(id) || id <= 0) return STUDIO_ACCENTS[0];
  return STUDIO_ACCENTS[id % STUDIO_ACCENTS.length];
};
