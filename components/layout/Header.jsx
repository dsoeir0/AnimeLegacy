import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../styles/header.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { filterOutHentai } from '../../lib/utils/anime';
import useAuth from '../../hooks/useAuth';
import useUserProfile from '../../hooks/useUserProfile';

const Header = ({ handleOnClick, showSidebarToggle = true, variant = 'default' }) => {
  const currentYear = new Date().getFullYear();
  const headerClass = variant === 'dark' ? styles.headerDark : styles.headerLight;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const searchResultsId = 'global-search-results';
  const router = useRouter();
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
    const handlePointerDown = (event) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
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
    const handlePointerDown = (event) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isProfileOpen]);

  return (
    <header className={`${styles.header} ${headerClass}`}>
      <div className={styles.left}>
        {showSidebarToggle ? (
          <button
            type="button"
            className={styles.burger}
            onClick={() => {
              handleOnClick();
            }}
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
            </svg>
          </button>
        ) : null}
        <Link href="/" legacyBehavior>
          <a className={styles.logo} aria-label="AnimeLegacy home">
            <Image
              className={styles.logoImage}
              src="/logo_text.png"
              alt="AnimeLegacy"
              width={320}
              height={72}
              priority
            />
          </a>
        </Link>
        <nav className={styles.nav}>
          <Link href="/" legacyBehavior>
            <a className={styles.navLink}>Home</a>
          </Link>
          <Link href={`/seasons/${currentYear}`} legacyBehavior>
            <a className={styles.navLink}>Seasonal</a>
          </Link>
          <Link href="/movies" legacyBehavior>
            <a className={styles.navLink}>Movies</a>
          </Link>
          <Link href="/my-list" legacyBehavior>
            <a className={styles.navLink}>My List</a>
          </Link>
        </nav>
      </div>
      <div className={styles.right}>
        <div className={styles.search} ref={searchRef}>
          <svg
            className={styles.searchIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
          >
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search anime, studios, genres..."
            aria-label="Search anime"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={searchResultsId}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (trimmedQuery.length >= 2) setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsOpen(false);
                event.currentTarget.blur();
                return;
              }
              if (event.key === 'Enter') {
                if (trimmedQuery.length >= 2) {
                  event.preventDefault();
                  setIsOpen(false);
                  router.push(`/search?q=${encodeURIComponent(trimmedQuery)}&page=1`);
                }
              }
            }}
          />
          {isOpen ? (
            <div className={styles.searchResults} role="listbox" id={searchResultsId}>
              {isLoading ? (
                <div className={styles.searchEmpty}>Searching...</div>
              ) : results.length === 0 ? (
                <div className={styles.searchEmpty}>No matches found.</div>
              ) : (
                results.map((item) => (
                  <Link key={item.mal_id} href={`/anime/${item.mal_id}`} legacyBehavior>
                    <a className={styles.searchItem} onClick={() => setIsOpen(false)}>
                      <div className={styles.searchThumb}>
                        <Image
                          src={
                            item?.images?.webp?.image_url ||
                            item?.images?.jpg?.image_url ||
                            '/logo_no_text.png'
                          }
                          alt={item.title}
                          width={56}
                          height={72}
                        />
                      </div>
                      <div className={styles.searchMeta}>
                        <div className={styles.searchTitle}>{item.title}</div>
                        <div className={styles.searchSub}>
                          <span>{item.type || 'Anime'}</span>
                          <span>{item.year || item?.aired?.prop?.from?.year || '—'}</span>
                          <span>{item.score ? `${item.score}` : 'NR'}</span>
                        </div>
                      </div>
                    </a>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div className={styles.profile} ref={profileRef}>
          <button
            className={styles.profileButton}
            type="button"
            onClick={async () => {
              if (authLoading) return;
              if (!user) {
                setIsProfileOpen((prev) => !prev);
                return;
              }
              setIsProfileOpen((prev) => !prev);
            }}
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
          >
            {avatar ? (
              <img
                className={styles.profileAvatar}
                src={avatar}
                alt={displayName || 'Profile'}
              />
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
                  <Link href="/profile" legacyBehavior>
                    <a
                      className={styles.profileItem}
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Profile
                    </a>
                  </Link>
                  <Link href="/my-list" legacyBehavior>
                    <a
                      className={styles.profileItem}
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      My List
                    </a>
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
                  <Link href="/login" legacyBehavior>
                    <a
                      className={styles.profileItem}
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Login
                    </a>
                  </Link>
                  <Link href="/sign-in" legacyBehavior>
                    <a
                      className={styles.profileItem}
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Sign in
                    </a>
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
