export const STUDIO_ACCENTS = [
  { base: '#84d9ff', ink: '#84d9ff' },
  { base: '#e8b468', ink: '#f2c37c' },
  { base: '#7d6bff', ink: '#9a8bff' },
  { base: '#3dd68c', ink: '#3dd68c' },
  { base: '#ff6a5b', ink: '#ff8276' },
  { base: '#ffb648', ink: '#ffc368' },
];

export const accentForStudio = (malId) => {
  const id = Number(malId);
  if (!Number.isFinite(id) || id <= 0) return STUDIO_ACCENTS[0];
  return STUDIO_ACCENTS[id % STUDIO_ACCENTS.length];
};
