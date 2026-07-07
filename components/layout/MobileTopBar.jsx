import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { getLanguage, setLanguage, translate } from 'react-switch-lang';
import useAuth from '../../hooks/useAuth';
import useUserProfile from '../../hooks/useUserProfile';
import { DEFAULT_LANGUAGE, flags, SUPPORTED_LANGUAGES } from '../../lib/constants/flags';
import { userInitials } from '../../lib/utils/userDisplay';
import NotificationsButton from '../notifications/NotificationsButton';
import InstallAppButton from '../ui/InstallAppButton';
import styles from './MobileTopBar.module.css';

function MobileTopBar({ title, t }) {
  const { user, signOutUser } = useAuth();
  const profile = useUserProfile(user?.uid);
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL || null;
  const displayName = profile?.username || user?.displayName || '';
  const initials = displayName ? userInitials(displayName) : 'AL';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(DEFAULT_LANGUAGE);
  const menuRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const active = typeof getLanguage === 'function' ? getLanguage() : DEFAULT_LANGUAGE;
    if (active && SUPPORTED_LANGUAGES.includes(active)) setCurrentLang(active);
  }, []);

  useEffect(() => {
    if (!isLangOpen) return undefined;
    const onPointer = (e) => {
      if (!langRef.current?.contains(e.target)) setIsLangOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsLangOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isLangOpen]);

  const handleLangSelect = (code) => {
    setLanguage(code);
    setCurrentLang(code);
    setIsLangOpen(false);
    try {
      localStorage.setItem('lang', code);
    } catch {}
  };

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onPointer = (e) => {
      if (!menuRef.current?.contains(e.target)) setIsMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label={t('nav.home')}>
        <img
          src="/brand/iris-mark.svg"
          alt=""
          width={28}
          height={28}
          className={styles.brandLogo}
        />
        {title ? <span className={styles.brandTitle}>{title}</span> : null}
      </Link>
      <div className={styles.actions}>
        <Link href="/search" className={styles.iconBtn} aria-label={t('nav.discover')}>
          <Search size={16} strokeWidth={2} />
        </Link>
        <div className={styles.lang} ref={langRef}>
          <button
            type="button"
            className={styles.langBtn}
            aria-haspopup="menu"
            aria-expanded={isLangOpen}
            aria-label={t('header.changeLanguage')}
            onClick={() => setIsLangOpen((v) => !v)}
          >
            <Image
              src={flags[currentLang]}
              alt={t(`lang.${currentLang}`)}
              width={20}
              height={14}
              className={styles.langFlag}
            />
          </button>
          {isLangOpen ? (
            <div className={styles.langMenu} role="listbox">
              {SUPPORTED_LANGUAGES.map((code) => {
                const active = code === currentLang;
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${styles.langOption} ${active ? styles.langOptionActive : ''}`}
                    onClick={() => handleLangSelect(code)}
                  >
                    <Image
                      src={flags[code]}
                      alt={t(`lang.${code}`)}
                      width={18}
                      height={13}
                      className={styles.langOptionFlag}
                    />
                    <span>{t(`lang.${code}`)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <NotificationsButton variant="mobile" />
        {user ? (
          <div className={styles.profile} ref={menuRef}>
            <button
              type="button"
              className={styles.avatar}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label={t('nav.profile')}
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              {avatar ? (
                <Image src={avatar} alt={displayName} width={36} height={36} />
              ) : (
                <span>{initials}</span>
              )}
            </button>
            {isMenuOpen ? (
              <div className={styles.menu} role="menu">
                <div className={styles.menuMeta}>
                  <strong>{displayName || t('nav.profile')}</strong>
                  {user.email ? <span>{user.email}</span> : null}
                </div>
                <Link
                  href="/profile"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.menu.profile')}
                </Link>
                <Link
                  href="/my-list"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.menu.myList')}
                </Link>
                <div className={styles.menuInstall}>
                  <InstallAppButton />
                </div>
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={async () => {
                    await signOutUser();
                    setIsMenuOpen(false);
                  }}
                >
                  {t('header.menu.signOut')}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/sign-in" className={styles.signIn}>
            {t('actions.signIn')}
          </Link>
        )}
      </div>
    </header>
  );
}

export default translate(MobileTopBar);
