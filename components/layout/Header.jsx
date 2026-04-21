import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Search, Bell, Sparkles, ArrowLeft } from 'lucide-react';
import { filterOutHentai } from '../../lib/utils/anime';
import useAuth from '../../hooks/useAuth';
import useUserProfile from '../../hooks/useUserProfile';
import IconButton from '../ui/IconButton';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Header.module.css';

const BREADCRUMBS = [
  { pattern: /^\/$/, label: 'Home' },
  { pattern: /^\/seasons/, label: 'Seasons' },
  { pattern: /^\/my-list/, label: 'My list' },
  { pattern: /^\/profile/, label: 'Profile' },
  { pattern: /^\/search/, label: 'Discover' },
  { pattern: /^\/anime\//, label: 'Anime' },
  { pattern: /^\/characters\/[^/]+/, label: 'Character' },
  { pattern: /^\/characters$/, label: 'Characters' },
  { pattern: /^\/voices\/[^/]+/, label: 'Voice actor' },
  { pattern: /^\/voices$/, label: 'Voice actors' },
  { pattern: /^\/studios\/[^/]+/, label: 'Studio' },
  { pattern: /^\/studios$/, label: 'Studios' },
  { pattern: /^\/calendar/, label: 'Calendar' },
  { pattern: /^\/collections/, label: 'Collections' },
  { pattern: /^\/compare/, label: 'Compare' },
  { pattern: /^\/movies/, label: 'Movies' },
  { pattern: /^\/sign-in/, label: 'Sign in' },
  { pattern: /^\/sign-up/, label: 'Sign up' },
];

const getBreadcrumb = (path) => {
  const match = BREADCRUMBS.find((b) => b.pattern.test(path));
  return match?.label || 'AnimeLegacy';
};

const BACK_PATHS = [/^\/anime\//, /^\/characters\/[^/]+/, /^\/voices\/[^/]+/, /^\/studios\/[^/]+/];
const shouldShowBack = (path) => BACK_PATHS.some((p) => p.test(path));

export default function Header({ variant = 'default' }) {
  const router = useRouter();
  const path = router.asPath.split('?')[0];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const searchResultsId = 'global-search-results';
  const { user, loading: authLoading, signOutUser } = useAuth();
  const profile = useUserProfile(user?.uid);
  const displayName = profile?.username || user?.displayName || 'AnimeLegacy User';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL || '';

  useEffect(() => {
    let isActive = true;
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(trimmedQuery)}&limit=6&order_by=score&sort=desc`,
        );
        const payload = await response.json();
        if (!isActive) return;
        const safeData = Array.isArray(payload?.data) ? payload.data : [];
        setResults(filterOutHentai(safeData));
        setIsOpen(true);
      } catch {
        if (!isActive) return;
        setResults([]);
        setIsOpen(true);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }, 350);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (e) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

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

  const breadcrumb = getBreadcrumb(path);
  const showBack = shouldShowBack(path);

  return (
    <header className={`${styles.header} ${variant === 'dark' ? styles.dark : ''}`}>
      <div className={styles.left}>
        {showBack ? (
          <IconButton icon={ArrowLeft} tooltip="Back" onClick={() => router.back()} />
        ) : null}
        <div className={styles.eyebrow}>{breadcrumb}</div>
      </div>

      <div className={styles.searchWrap} ref={searchRef}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search anime, characters, studios…"
          aria-label="Search anime"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={searchResultsId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (trimmedQuery.length >= 2) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              e.currentTarget.blur();
              return;
            }
            if (e.key === 'Enter' && trimmedQuery.length >= 2) {
              e.preventDefault();
              setIsOpen(false);
              router.push(`/search?q=${encodeURIComponent(trimmedQuery)}&page=1`);
            }
          }}
        />
        <kbd className={styles.kbd}>⌘K</kbd>
        {isOpen ? (
          <div className={styles.searchResults} role="listbox" id={searchResultsId}>
            {isLoading ? (
              <div className={styles.searchEmpty}>Searching…</div>
            ) : results.length === 0 ? (
              <div className={styles.searchEmpty}>No matches found.</div>
            ) : (
              results.map((item) => (
                <Link
                  key={item.mal_id}
                  href={`/anime/${item.mal_id}`}
                  className={styles.searchItem}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={styles.searchThumb}>
                    <Image
                      src={item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '/logo_no_text.png'}
                      alt={item.title}
                      width={40}
                      height={52}
                    />
                  </div>
                  <div className={styles.searchMeta}>
                    <div className={styles.searchTitle}>{item.title}</div>
                    <div className={styles.searchSub}>
                      <span>{item.type || 'Anime'}</span>
                      <span>·</span>
                      <span>{item.year || item?.aired?.prop?.from?.year || '—'}</span>
                      <span>·</span>
                      <span>{item.score ? `★ ${item.score}` : 'NR'}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.right}>
        <LanguageSwitcher />
        <div className={styles.divider} />
        <IconButton icon={Sparkles} tooltip="What's new" />
        <IconButton icon={Bell} tooltip="Notifications" />
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
              <img className={styles.profileAvatar} src={avatar} alt={displayName || 'Profile'} />
            ) : (
              <span className={styles.profileInitials}>
                {(displayName || 'U').slice(0, 1).toUpperCase()}
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
                    Profile
                  </Link>
                  <Link
                    href="/my-list"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    My List
                  </Link>
                  <button
                    className={styles.profileItem}
                    type="button"
                    onClick={async () => {
                      await signOutUser();
                      setIsProfileOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className={styles.profileItem}
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Sign up
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
