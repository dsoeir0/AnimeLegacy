export const userInitials = (name) =>
  String(name || 'U').trim().slice(0, 1).toUpperCase() || 'U';

export const nameInitials = (name, count = 2) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (count === 1) return parts[0].slice(0, 1).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
