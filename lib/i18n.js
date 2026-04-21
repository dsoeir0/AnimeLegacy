import {
  setTranslations,
  setDefaultLanguage,
  setLanguageCookie,
  setLanguage,
  getLanguage,
} from 'react-switch-lang';

import en from '../lang/en.json';
import pt from '../lang/pt.json';
import es from '../lang/es.json';
import fr from '../lang/fr.json';
import { DEFAULT_LANGUAGE } from './constants/flags';

const translations = { en, pt, es, fr };

let initialized = false;

export function initI18n() {
  if (initialized) return;
  initialized = true;
  setTranslations(translations);
  setDefaultLanguage(DEFAULT_LANGUAGE);
  setLanguageCookie();
}

// Apply the user's stored preference. Client-only.
export function applyStoredLanguage() {
  if (typeof window === 'undefined') return;
  try {
    const preferredLang = localStorage.getItem('lang');
    const currentLang = typeof getLanguage === 'function' ? getLanguage() : null;
    if (preferredLang && translations[preferredLang] && preferredLang !== currentLang) {
      setLanguage(preferredLang);
    }
  } catch (error) {
    // Non-blocking: if storage is unavailable, fall back to cookies/default.
    // eslint-disable-next-line no-console
    console.warn('Unable to apply stored language preference:', error);
  }
}

// Initialise at module load so translations are registered before any
// component tries to use the translate() HOC.
initI18n();
