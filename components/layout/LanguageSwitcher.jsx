import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { setLanguage, getLanguage, translate } from 'react-switch-lang';
import { flags, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../lib/constants/flags';
import styles from './LanguageSwitcher.module.css';

function LanguageSwitcher({ t }) {
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(DEFAULT_LANGUAGE);
  const rootRef = useRef(null);

  // Sync with react-switch-lang on mount (after localStorage restore in _app.js runs).
  useEffect(() => {
    const active = typeof getLanguage === 'function' ? getLanguage() : DEFAULT_LANGUAGE;
    if (active && SUPPORTED_LANGUAGES.includes(active)) {
      setCurrentLang(active);
    }
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  const handleSelect = (code) => {
    setOpen(false);
    setLanguage(code);
    setCurrentLang(code);
    try {
      localStorage.setItem('lang', code);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to persist language preference:', error);
    }
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        onClick={() => setOpen((prev) => !prev)}
      >
        <img src={flags[currentLang]} alt="" className={styles.flag} />
        <span className={styles.label}>{t(`lang.${currentLang}`)}</span>
        <ChevronDown size={14} className={styles.caret} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.menu} role="listbox">
          {SUPPORTED_LANGUAGES.map((code) => {
            const active = code === currentLang;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => handleSelect(code)}
              >
                <img src={flags[code]} alt="" className={styles.flag} />
                <span>{t(`lang.${code}`)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default translate(LanguageSwitcher);
