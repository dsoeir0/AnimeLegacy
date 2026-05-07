export const SORT_KEYS = ['top', 'new', 'az', 'popular'];

export const sortConfig = {
  top: { order_by: 'score', sort: 'desc' },
  new: { order_by: 'start_date', sort: 'desc' },
  az: { order_by: 'title', sort: 'asc' },
  popular: { order_by: 'popularity', sort: 'asc' },
};

export const VIEW_KEYS = ['grid', 'list'];

export const TYPE_KEYS = ['', 'tv', 'movie', 'ova', 'special', 'ona'];

export const STATUS_KEYS = ['', 'airing', 'complete'];

export const SCORE_KEYS = ['', '6', '7', '8', '9'];

export const DECADE_KEYS = ['', '2020', '2010', '2000', 'pre2000'];

export const decadeRange = {
  2020: { start: '2020-01-01', end: '2029-12-31' },
  2010: { start: '2010-01-01', end: '2019-12-31' },
  2000: { start: '2000-01-01', end: '2009-12-31' },
  pre2000: { start: null, end: '1999-12-31' },
};

export const normalizeSort = (raw) => (SORT_KEYS.includes(raw) ? raw : 'top');
export const normalizeView = (raw) => (VIEW_KEYS.includes(raw) ? raw : 'grid');
export const normalizeType = (raw) => (TYPE_KEYS.includes(raw) ? raw : '');
export const normalizeStatus = (raw) =>
  STATUS_KEYS.includes(raw) ? raw : '';
export const normalizeScore = (raw) =>
  SCORE_KEYS.includes(String(raw)) ? String(raw) : '';
export const normalizeDecade = (raw) =>
  DECADE_KEYS.includes(raw) ? raw : '';

export const overrideSort = (queryString, sortKey) => {
  const cfg = sortConfig[normalizeSort(sortKey)];
  if (!cfg) return queryString;
  let next = queryString;
  if (/order_by=[^&]*/.test(next)) {
    next = next.replace(/order_by=[^&]*/g, `order_by=${cfg.order_by}`);
  } else {
    next = next ? `${next}&order_by=${cfg.order_by}` : `order_by=${cfg.order_by}`;
  }
  if (/(^|&)sort=[^&]*/.test(next)) {
    next = next.replace(/(^|&)sort=[^&]*/g, (_m, p) => `${p}sort=${cfg.sort}`);
  } else {
    next = next ? `${next}&sort=${cfg.sort}` : `sort=${cfg.sort}`;
  }
  return next;
};

export const buildGenreQuery = (genreId, sortKey) => {
  const cfg = sortConfig[normalizeSort(sortKey)];
  return `genres=${genreId}&order_by=${cfg.order_by}&sort=${cfg.sort}`;
};

export const applyExtraFilters = (
  baseParams,
  { type, status, decade, minScore, sort, today },
) => {
  const parts = baseParams ? [baseParams] : [];
  if (type) parts.push(`type=${type}`);
  if (status) parts.push(`status=${status}`);
  if (minScore) parts.push(`min_score=${minScore}`);

  const range = decade ? decadeRange[decade] : null;
  if (range) {
    if (range.start) parts.push(`start_date=${range.start}`);
    if (range.end) parts.push(`end_date=${range.end}`);
  } else if (sort === 'new' && today) {
    parts.push(`end_date=${today}`);
  }

  return parts.join('&');
};
