export const pickStudioName = (producer) => {
  if (!producer) return 'Unknown';
  const titles = Array.isArray(producer.titles) ? producer.titles : [];
  const preferred = titles.find((title) => title?.type === 'Default') || titles[0];
  return preferred?.title || producer.name || 'Unknown';
};

export const studioInitial = (name) => {
  const letter = String(name || '?').trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
};

export const studioInitials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

// Jikan's producers filter conflates studio+producer+licensor roles. Prefer studio-role
// matches; fall back to producer-role so pure financiers (Aniplex, TV Tokyo) aren't empty.
export const classifyProducerRole = (list, producerId) => {
  const id = Number(producerId);
  if (!Number.isFinite(id) || id <= 0 || !Array.isArray(list)) {
    return { role: 'producer', matches: [] };
  }
  const asStudio = list.filter(
    (a) =>
      Array.isArray(a?.studios) &&
      a.studios.some((s) => Number(s?.mal_id) === id),
  );
  if (asStudio.length > 0) {
    return { role: 'studio', matches: asStudio };
  }
  const asProducer = list.filter(
    (a) =>
      Array.isArray(a?.producers) &&
      a.producers.some((p) => Number(p?.mal_id) === id),
  );
  return { role: 'producer', matches: asProducer };
};
