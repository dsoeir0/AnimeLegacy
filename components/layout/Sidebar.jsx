import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  Calendar,
  Film,
  Users,
  Mic,
  Building2,
  Bookmark,
  List,
  User,
  GitBranch,
  Compass,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { translate } from 'react-switch-lang';
import Logo from '../ui/Logo';
import useAuth from '../../hooks/useAuth';
import useUserProfile from '../../hooks/useUserProfile';
import styles from './Sidebar.module.css';

const STORAGE_KEY = 'animeLegacy.sidebar.collapsed';

const exploreItems = [
  { id: 'home', labelKey: 'nav.home', href: '/', icon: Home, match: (p) => p === '/' },
  { id: 'calendar', labelKey: 'nav.calendar', href: '/calendar', icon: Calendar, match: (p) => p.startsWith('/calendar') },
  { id: 'seasons', labelKey: 'nav.seasons', href: '/seasons', icon: Film, match: (p) => p.startsWith('/seasons') },
  { id: 'characters', labelKey: 'nav.characters', href: '/characters', icon: Users, match: (p) => p.startsWith('/characters') },
  { id: 'voices', labelKey: 'nav.voiceActors', href: '/voices', icon: Mic, match: (p) => p.startsWith('/voices') },
  { id: 'studios', labelKey: 'nav.studios', href: '/studios', icon: Building2, match: (p) => p.startsWith('/studios') },
  { id: 'collections', labelKey: 'nav.collections', href: '/collections', icon: Bookmark, match: (p) => p.startsWith('/collections') },
];

const libraryItems = [
  { id: 'mylist', labelKey: 'nav.myList', href: '/my-list', icon: List, match: (p) => p.startsWith('/my-list') },
  { id: 'profile', labelKey: 'nav.profile', href: '/profile', icon: User, match: (p) => p.startsWith('/profile') },
  { id: 'compare', labelKey: 'nav.compare', href: '/compare', icon: GitBranch, match: (p) => p.startsWith('/compare') },
];

const accountItems = [
  { id: 'search', labelKey: 'nav.discover', href: '/search', icon: Compass, match: (p) => p.startsWith('/search') },
];

function NavItem({ item, collapsed, active, t }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${active ? styles.navItemActive : ''} ${collapsed ? styles.navItemCollapsed : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {active && !collapsed ? <span className={styles.activeBar} /> : null}
      <Icon size={17} strokeWidth={active ? 2 : 1.75} />
      {!collapsed ? <span>{t(item.labelKey)}</span> : null}
    </Link>
  );
}

function Sidebar({ t }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const profile = useUserProfile(user?.uid);
  const displayName = profile?.username || user?.displayName || 'Guest';
  const avatar = profile?.avatarData || profile?.avatarUrl || user?.photoURL || '';
  const username = profile?.username || (user ? (user.email?.split('@')[0] || 'user') : 'guest');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const path = router.asPath.split('?')[0];
  const isActive = (item) => item.match(path);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.head}>
        {collapsed ? <Logo size={32} showWordmark={false} /> : <Logo size={28} />}
        <button
          type="button"
          onClick={toggle}
          className={styles.collapseBtn}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {!collapsed ? <div className={styles.groupLabel}>{t('nav.explore')}</div> : null}
        {exploreItems.map((it) => (
          <NavItem key={it.id} item={it} collapsed={collapsed} active={isActive(it)} t={t} />
        ))}

        <div className={styles.separator} />
        {!collapsed ? <div className={styles.groupLabel}>{t('nav.yourLibrary')}</div> : null}
        {libraryItems.map((it) => (
          <NavItem key={it.id} item={it} collapsed={collapsed} active={isActive(it)} t={t} />
        ))}

        <div className={styles.separator} />
        {!collapsed ? <div className={styles.groupLabel}>{t('nav.account')}</div> : null}
        {accountItems.map((it) => (
          <NavItem key={it.id} item={it} collapsed={collapsed} active={isActive(it)} t={t} />
        ))}
      </nav>

      <div className={styles.userCard}>
        <Link
          href={user ? '/profile' : '/sign-in'}
          className={`${styles.userRow} ${collapsed ? styles.userRowCollapsed : ''}`}
        >
          {avatar ? (
            <img src={avatar} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>{(displayName || 'U').slice(0, 1).toUpperCase()}</div>
          )}
          {!collapsed ? (
            <div className={styles.userMeta}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userHandle}>@{username}</div>
            </div>
          ) : null}
        </Link>
        {!collapsed ? (
          <Link href="/privacy" className={styles.footerLink}>
            {t('privacy.eyebrow')}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

export default translate(Sidebar);
