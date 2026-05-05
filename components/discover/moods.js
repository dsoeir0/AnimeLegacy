// Curated mood taxonomy for the Discover page. Each mood maps to a Jikan
// search filter (genres or order_by) so clicking a mood card navigates to
// /search pre-filtered. Accent colours follow the same palette ethos as
// the studios index — hex on purpose because we need alpha variants in
// inline style attributes and CSS color-mix isn't universally supported
// at the versions we target.
export const DISCOVER_MOODS = [
  {
    id: 'slow',
    labelKey: 'discoverPage.moods.slow.label',
    subKey: 'discoverPage.moods.slow.sub',
    accent: '#8ea8c9',
    // Slow-burn: drama-forward, slice-of-life adjacent, typically seinen.
    query: 'genres=8,36&order_by=score&sort=desc',
  },
  {
    id: 'cry',
    labelKey: 'discoverPage.moods.cry.label',
    subKey: 'discoverPage.moods.cry.sub',
    accent: '#e89d68',
    // Drama + Movie — tear-jerkers tend to cluster in feature films.
    query: 'genres=8&type=movie&order_by=score&sort=desc',
  },
  {
    id: 'adrenaline',
    labelKey: 'discoverPage.moods.adrenaline.label',
    subKey: 'discoverPage.moods.adrenaline.sub',
    accent: '#c44d3f',
    // Action — ranked by score.
    query: 'genres=1&order_by=score&sort=desc',
  },
  {
    id: 'cozy',
    labelKey: 'discoverPage.moods.cozy.label',
    subKey: 'discoverPage.moods.cozy.sub',
    accent: '#a8c78b',
    // Slice of Life + Comedy — Sunday-afternoon comfort.
    query: 'genres=36,4&order_by=score&sort=desc',
  },
  {
    id: 'headtrip',
    labelKey: 'discoverPage.moods.headtrip.label',
    subKey: 'discoverPage.moods.headtrip.sub',
    accent: '#9d6bff',
    // Psychological + Mystery — the strange and dense.
    query: 'genres=40,7&order_by=score&sort=desc',
  },
  {
    id: 'ensemble',
    labelKey: 'discoverPage.moods.ensemble.label',
    subKey: 'discoverPage.moods.ensemble.sub',
    accent: '#84d9ff',
    // Adventure + Fantasy — typically large-cast serials.
    query: 'genres=2,10&order_by=score&sort=desc',
  },
];
