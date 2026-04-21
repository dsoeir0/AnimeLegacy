// Flag SVGs served from https://flagcdn.com (same source used across the platform).
// Keys are ISO language codes; values are the country flag that represents that language.

export const flags = {
  en: 'https://flagcdn.com/gb.svg',
  pt: 'https://flagcdn.com/pt.svg',
  es: 'https://flagcdn.com/es.svg',
  fr: 'https://flagcdn.com/fr.svg',
};

export const SUPPORTED_LANGUAGES = Object.keys(flags);
export const DEFAULT_LANGUAGE = 'en';
