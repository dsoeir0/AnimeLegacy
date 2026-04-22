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

// Converts a JST weekday + "HH:MM" broadcast time into the corresponding
// local-timezone weekday + hour + minute, using modular arithmetic over a
// 7-day window. Day crossings wrap (JST Mon 00:30 → Sun evening for negative
// offsets, Sun 23:30 → Mon morning for positive offsets).
//
// Must be called on the client — the server does not know the viewer's
// timezone. Calendar uses this from a useEffect so SSR renders the JST
// bucketing and client re-buckets to the viewer's local schedule.
//
// jstDayIdx: 0=Mon, 1=Tue, ..., 6=Sun
// timeStr: "HH:MM" in JST (24h)
// returns { dayIdx, hour, minute, display } where `display` is "HH:MM" 24h
//   in the viewer's locale, or null when the input can't be parsed.
export const jstToLocalSlot = (jstDayIdx, timeStr) => {
  if (typeof timeStr !== 'string') return null;
  if (!Number.isInteger(jstDayIdx) || jstDayIdx < 0 || jstDayIdx > 6) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const jh = Number(match[1]);
  const jm = Number(match[2]);
  if (!Number.isFinite(jh) || !Number.isFinite(jm)) return null;
  if (jh < 0 || jh > 23 || jm < 0 || jm > 59) return null;

  // Minutes to add to a JST wall-clock to get the viewer's local wall-clock.
  //   UTC = JST - 540
  //   local = UTC - getTimezoneOffset()  (getTimezoneOffset returns minutes
  //     to ADD to local to get UTC, so it's negative for east-of-UTC zones)
  // → local = JST - 540 - getTimezoneOffset()
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
