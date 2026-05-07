export const DISCOVER_MOODS = [
  {
    id: 'slow',
    labelKey: 'discoverPage.moods.slow.label',
    subKey: 'discoverPage.moods.slow.sub',
    accent: '#8ea8c9',
    query: 'genres=8&order_by=score&sort=desc',
  },
  {
    id: 'cry',
    labelKey: 'discoverPage.moods.cry.label',
    subKey: 'discoverPage.moods.cry.sub',
    accent: '#e89d68',
    query: 'genres=8&type=movie&order_by=score&sort=desc',
  },
  {
    id: 'adrenaline',
    labelKey: 'discoverPage.moods.adrenaline.label',
    subKey: 'discoverPage.moods.adrenaline.sub',
    accent: '#c44d3f',
    query: 'genres=1&order_by=score&sort=desc',
  },
  {
    id: 'cozy',
    labelKey: 'discoverPage.moods.cozy.label',
    subKey: 'discoverPage.moods.cozy.sub',
    accent: '#a8c78b',
    query: 'genres=36&order_by=score&sort=desc',
  },
  {
    id: 'headtrip',
    labelKey: 'discoverPage.moods.headtrip.label',
    subKey: 'discoverPage.moods.headtrip.sub',
    accent: '#9d6bff',
    query: 'genres=40&order_by=score&sort=desc',
  },
  {
    id: 'ensemble',
    labelKey: 'discoverPage.moods.ensemble.label',
    subKey: 'discoverPage.moods.ensemble.sub',
    accent: '#84d9ff',
    query: 'genres=2&order_by=score&sort=desc',
  },
  {
    id: 'firstLove',
    labelKey: 'discoverPage.moods.firstLove.label',
    subKey: 'discoverPage.moods.firstLove.sub',
    accent: '#e8748a',
    query: 'genres=22&order_by=score&sort=desc',
  },
  {
    id: 'mystery',
    labelKey: 'discoverPage.moods.mystery.label',
    subKey: 'discoverPage.moods.mystery.sub',
    accent: '#6b6f85',
    query: 'genres=7&order_by=score&sort=desc',
  },
  {
    id: 'scifi',
    labelKey: 'discoverPage.moods.scifi.label',
    subKey: 'discoverPage.moods.scifi.sub',
    accent: '#7d6bff',
    query: 'genres=24&order_by=score&sort=desc',
  },
  {
    id: 'sports',
    labelKey: 'discoverPage.moods.sports.label',
    subKey: 'discoverPage.moods.sports.sub',
    accent: '#3dd68c',
    query: 'genres=30&order_by=score&sort=desc',
  },
  {
    id: 'supernatural',
    labelKey: 'discoverPage.moods.supernatural.label',
    subKey: 'discoverPage.moods.supernatural.sub',
    accent: '#a98566',
    query: 'genres=37&order_by=score&sort=desc',
  },
  {
    id: 'mecha',
    labelKey: 'discoverPage.moods.mecha.label',
    subKey: 'discoverPage.moods.mecha.sub',
    accent: '#b6a9ff',
    query: 'genres=18&order_by=score&sort=desc',
  },
];

export const VISIBLE_MOODS = 6;

export const fisherYatesPick = (arr, n, rng = Math.random) => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};
