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

// Parses a "HH:MM" JST broadcast time and returns { jst, local } where
// `local` is the same instant formatted in the user's default timezone.
// Returns null when the input can't be parsed.
//
// Must be called on the client — the server has no idea what timezone
// the viewer is in. The calendar uses this from a useEffect so the SSR
// renders JST and the local pill fills in on hydration.
export const jstToLocalTime = (timeStr) => {
  if (typeof timeStr !== 'string') return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  // Build an instant for "today at HH:MM JST" (JST is fixed UTC+9, no DST).
  const now = new Date();
  const utcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h - 9, m);
  const instant = new Date(utcMs);
  const local = instant.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { jst: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, local };
};
