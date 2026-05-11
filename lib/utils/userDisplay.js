export const userInitials = (name) =>
  String(name || 'U').trim().slice(0, 1).toUpperCase() || 'U';
