export const formatRelativeTime = (value) => {
  if (!value) return '';
  const timestamp = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (!timestamp || Number.isNaN(timestamp.getTime())) return '';
  const diffMs = timestamp.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(minutes) < 60) {
    return rtf.format(diffMs < 0 ? -minutes : minutes, 'minute');
  }
  if (Math.abs(hours) < 24) {
    return rtf.format(diffMs < 0 ? -hours : hours, 'hour');
  }
  return rtf.format(diffMs < 0 ? -days : days, 'day');
};

export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const mondayOfWeek = (today = new Date()) => {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const js = d.getDay();
  const offset = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + offset);
  return d;
};

export const weekdayDates = (today = new Date()) => {
  const monday = mondayOfWeek(today);
  return WEEKDAY_KEYS.map((key, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { key, date: d };
  });
};

export const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const jstToLocalSlot = (jstDayIdx, timeStr) => {
  if (typeof timeStr !== 'string') return null;
  if (!Number.isInteger(jstDayIdx) || jstDayIdx < 0 || jstDayIdx > 6) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const jh = Number(match[1]);
  const jm = Number(match[2]);
  if (!Number.isFinite(jh) || !Number.isFinite(jm)) return null;
  if (jh < 0 || jh > 23 || jm < 0 || jm > 59) return null;

  // local = JST - 540 - getTimezoneOffset() (offset is +ve west-of-UTC)
  const localOffsetMin = -new Date().getTimezoneOffset();
  const deltaMin = localOffsetMin - 540;

  const weekMin = 7 * 1440;
  const total = jstDayIdx * 1440 + jh * 60 + jm + deltaMin;
  const normalized = ((total % weekMin) + weekMin) % weekMin;
  const dayIdx = Math.floor(normalized / 1440);
  const hour = Math.floor((normalized % 1440) / 60);
  const minute = normalized % 60;
  const display = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { dayIdx, hour, minute, display };
};
