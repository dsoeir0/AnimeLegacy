export const getSeasonFromDate = (date = new Date()) => {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return 'winter';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'fall';
};

export const formatSeasonLabel = (season, year) => {
  if (season) {
    const label = `${season[0].toUpperCase()}${season.slice(1)}`;
    return year ? `${label} ${year}` : label;
  }
  if (year) return `${year}`;
  return 'Unknown';
};

export const SEASON_KEYS = ['winter', 'spring', 'summer', 'fall'];

const SEASON_START_DAY = { winter: [0, 1], spring: [3, 1], summer: [6, 1], fall: [9, 1] };
const SEASON_END_DAY = { winter: [2, 31], spring: [5, 30], summer: [8, 30], fall: [11, 31] };

export const computePeriodKpi = (scope, season, year, now = new Date()) => {
  const [startMonth, startDay] = scope === 'all' ? [0, 1] : SEASON_START_DAY[season];
  const [endMonth, endDay] = scope === 'all' ? [11, 31] : SEASON_END_DAY[season];
  const periodStart = new Date(year, startMonth, startDay);
  const periodEnd = new Date(year, endMonth, endDay, 23, 59, 59);
  const t = now.getTime();
  if (t > periodEnd.getTime()) return { kind: 'ended' };
  if (t < periodStart.getTime()) {
    const days = Math.max(0, Math.ceil((periodStart.getTime() - t) / 86400000));
    return { kind: 'upcoming', days };
  }
  const days = Math.max(0, Math.ceil((periodEnd.getTime() - t) / 86400000));
  return { kind: 'active', days };
};
