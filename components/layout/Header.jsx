import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Bell, Sparkles, ArrowLeft } from 'lucide-react';
import { translate } from 'react-switch-lang';
import useAuth from '../../hooks/useAuth';
import useUserProfile from '../../hooks/useUserProfile';
import { currentPath } from '../../lib/utils/router';
import { userInitials } from '../../lib/utils/userDisplay';
import IconButton from '../ui/IconButton';
import LanguageSwitcher from './LanguageSwitcher';
import HeaderSearch from './HeaderSearch';
import styles from './Header.module.css';

const BREADCRUMBS = [
  { pattern: /^\/$/, key: 'home' },
  { pattern: /^\/seasons/, key: 'seasons' },
  { pattern: /^\/my-list/, key: 'myList' },
  { pattern: /^\/profile/, key: 'profile' },
  { pattern: /^\/search/, key: 'search' },
  { pattern: /^\/anime\//, key: 'anime' },
  { pattern: /^\/characters\/[^/]+/, key: 'character' },
  { pattern: /^\/characters$/, key: 'characters' },
  { pattern: /^\/voices\/[^/]+/, key: 'voiceActor' },
  { pattern: /^\/voices$/, key: 'voiceActors' },
  { pattern: /^\/studios\/[^/]+/, key: 'studio' },
  { pattern: /^\/studios$/, key: 'studios' },
  { pattern: /^\/calendar/, key: 'calendar' },
  { pattern: /^\/collections/, key: 'collections' },
  { pattern: /^\/compare/, key: 'compare' },
  { pattern: /^\/movies/, key: 'movies' },
  { pattern: /^\/sign-in/, key: 'signIn' },
  { pattern: /^\/sign-up/, key: 'signUp' },
];

const BACK_PATHS = [/^\/anime\//, /^\/characters\/[^/]+/, /^\/voices\/[^/]+/, /^\/studios\/[^/]+/];
const shouldShowBack = (path) => BACK_PATHS.some((p) => p.test(path));

function Header({ variant = 'default', t }) {
  const router = useRouter();
  const path = currentPath(router);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const { user, loading: authLoading, signOutUser } = useAuth();
  const profile = useUserProfile(user?.uid);
  const displayName = profile?.username || user?.displayName || 'AnimeLegacy User';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL || '';

  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const handlePointerDown = (e) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isProfileOpen]);

  const breadcrumbMatch = BREADCRUMBS.find((b) => b.pattern.test(path));
  const breadcrumb = breadcrumbMatch ? t(`header.breadcrumb.${breadcrumbMatch.key}`) : 'AnimeLegacy';
  const showBack = shouldShowBack(path);

  return (
    <header className={`${styles.header} ${variant === 'dark' ? styles.dark : ''}`}>
      <div className={styles.left}>
        {showBack ? (
          <IconButton icon={ArrowLeft} tooltip={t('header.back')} onClick={() => router.back()} />
        ) : null}
        <div className={styles.eyebrow}>{breadcrumb}</div>
      </div>

      <HeaderSearch />

      <div className={styles.right}>
        <LanguageSwitcher />
        <div className={styles.divider} />
        <IconButton icon={Sparkles} tooltip={t('header.whatsNew')} />
        <IconButton icon={Bell} tooltip={t('header.notifications')} />
        <div className={styles.divider} />
        <div className={styles.profile} ref={profileRef}>
          <button
            className={styles.profileButton}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            onClick={() => {
              if (authLoading) return;
              setIsProfileOpen((prev) => !prev);
            }}
          >
            {avatar ? (
              <Image
                className={styles.profileAvatar}
                src={avatar}
                alt={displayName || 'Profile'}
                width={32}
                height={32}
              />
            ) : (
              <span className={styles.profileInitials}>
                {userInitials(displayName)}
              </span>
            )}
          </button>
          {isProfileOpen ? (
            <div className={styles.profileMenu} role="menu">
              {user ? (
                <>
                  <div className={styles.profileMeta}>
                    <strong>{displayName}</strong>
                    <span>{user.email || ''}</span>
                  </div>
                  <Link
                    href="/profile"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    {t('header.menu.profile')}
                  </Link>
                  <Link
                    href="/my-list"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    {t('header.menu.myList')}
                  </Link>
                  <button
                    className={styles.profileItem}
                    type="button"
                    onClick={async () => {
                      await signOutUser();
                      setIsProfileOpen(false);
                    }}
                  >
                    {t('header.menu.signOut')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    {t('header.menu.signIn')}
                  </Link>
                  <Link
                    href="/sign-up"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    {t('header.menu.signUp')}
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default translate(Header);
