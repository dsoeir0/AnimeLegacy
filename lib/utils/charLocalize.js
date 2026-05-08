const ROLE_KEY_MAP = {
  main: 'character.role.main',
  supporting: 'character.role.supporting',
  background: 'character.role.background',
};

const LANGUAGE_KEY_MAP = {
  japanese: 'character.lang.japanese',
  english: 'character.lang.english',
  french: 'character.lang.french',
  spanish: 'character.lang.spanish',
  italian: 'character.lang.italian',
  german: 'character.lang.german',
  portuguese: 'character.lang.portuguese',
  'portuguese (br)': 'character.lang.portugueseBr',
  brazilian: 'character.lang.portugueseBr',
  korean: 'character.lang.korean',
  mandarin: 'character.lang.mandarin',
  cantonese: 'character.lang.cantonese',
  hungarian: 'character.lang.hungarian',
  russian: 'character.lang.russian',
  hebrew: 'character.lang.hebrew',
  polish: 'character.lang.polish',
  turkish: 'character.lang.turkish',
};

const norm = (raw) => String(raw || '').toLowerCase().trim();

export const localizeRole = (raw, t) => {
  if (!raw) return t('anime.roleLabel');
  const key = ROLE_KEY_MAP[norm(raw)];
  return key ? t(key) : raw;
};

export const localizeLanguage = (raw, t) => {
  if (!raw) return '—';
  const key = LANGUAGE_KEY_MAP[norm(raw)];
  return key ? t(key) : raw;
};
