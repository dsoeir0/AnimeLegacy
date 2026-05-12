import Link from 'next/link';
import { useRouter } from 'next/router';
import { Calendar, Film, Home, List, Search } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { currentPath } from '../../lib/utils/router';
import styles from './BottomNav.module.css';

const ITEMS = [
  { id: 'home', labelKey: 'nav.home', href: '/', icon: Home, match: (p) => p === '/' },
  {
    id: 'seasons',
    labelKey: 'nav.seasons',
    href: '/seasons',
    icon: Film,
    match: (p) => p.startsWith('/seasons'),
  },
  {
    id: 'calendar',
    labelKey: 'nav.calendar',
    href: '/calendar',
    icon: Calendar,
    match: (p) => p.startsWith('/calendar'),
  },
  {
    id: 'mylist',
    labelKey: 'nav.myList',
    href: '/my-list',
    icon: List,
    match: (p) => p.startsWith('/my-list'),
  },
  {
    id: 'search',
    labelKey: 'nav.discover',
    href: '/search',
    icon: Search,
    match: (p) => p.startsWith('/search'),
  },
];

function BottomNav({ t }) {
  const router = useRouter();
  const path = currentPath(router);
  return (
    <nav className={styles.bottomNav} aria-label={t('nav.primaryAriaLabel')}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.match(path);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.item} ${active ? styles.itemActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon}>
              <Icon size={22} strokeWidth={active ? 2 : 1.8} />
            </span>
            <span className={styles.label}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default translate(BottomNav);
