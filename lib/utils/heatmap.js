import { dateKey, toJsDate } from './profileActivity';

const DAY_MS = 86400000;
const DEFAULT_WEEKS = 26;
const LEVEL_THRESHOLDS = [0, 1, 3, 5, 8];

const levelFor = (count) => {
  if (count <= 0) return 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (count >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
};

const mondayOf = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
};

export const buildHeatmap = (timestamps, { weeks = DEFAULT_WEEKS, now = new Date() } = {}) => {
  const tally = new Map();
  for (const value of timestamps || []) {
    const date = toJsDate(value);
    if (!date) continue;
    const key = dateKey(date);
    tally.set(key, (tally.get(key) || 0) + 1);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const lastMonday = mondayOf(today);
  const firstMonday = new Date(lastMonday.getTime() - (weeks - 1) * 7 * DAY_MS);

  const cells = [];
  for (let w = 0; w < weeks; w += 1) {
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(firstMonday.getTime() + (w * 7 + d) * DAY_MS);
      if (date > today) {
        cells.push({ week: w, day: d, key: dateKey(date), count: 0, level: 0, future: true });
        continue;
      }
      const key = dateKey(date);
      const count = tally.get(key) || 0;
      cells.push({ week: w, day: d, key, count, level: levelFor(count), future: false });
    }
  }

  return { cells, weeks, days: 7 };
};
