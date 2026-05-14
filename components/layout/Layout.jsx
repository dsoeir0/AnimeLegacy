import Head from 'next/head';
import { useRouter } from 'next/router';
import BottomNav from './BottomNav';
import Header from './Header';
import MobileTopBar from './MobileTopBar';
import RouteProgress from './RouteProgress';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout({
  children,
  showSidebar = true,
  showHeader = true,
  hideHeaderOnMobile = false,
  mobileTitle = null,
  title = 'AnimeLegacy',
  description = 'Curated anime seasons, movies, and personal watchlists.',
}) {
  const router = useRouter();
  const desktopHeaderClass = `${styles.headerWrap} ${
    hideHeaderOnMobile || mobileTitle ? styles.headerHideOnMobile : ''
  }`;
  return (
    <div className={styles.shell}>
      <RouteProgress />
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" type="image/svg+xml" href="/brand/iris-favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      {showSidebar ? <Sidebar /> : null}
      <main className={styles.main}>
        {showHeader ? (
          <div className={desktopHeaderClass}>
            <Header />
          </div>
        ) : null}
        {showSidebar && mobileTitle ? (
          <div className={styles.mobileTopBar}>
            <MobileTopBar title={mobileTitle} />
          </div>
        ) : null}
        <div key={router.asPath} className={`${styles.content} al-rise`}>
          {children}
        </div>
      </main>
      {showSidebar ? <BottomNav /> : null}
    </div>
  );
}
