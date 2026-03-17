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
