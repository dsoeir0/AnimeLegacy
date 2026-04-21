import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout({
  children,
  showSidebar = true,
  showHeader = true,
  title = 'AnimeLegacy',
  description = 'Curated anime seasons, movies, and personal watchlists.',
}) {
  const router = useRouter();
  return (
    <div className={styles.shell}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/logo_no_text.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/logo_no_text.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/logo_no_text.png" />
      </Head>
      {showSidebar ? <Sidebar /> : null}
      <main className={styles.main}>
        {showHeader ? <Header /> : null}
        <div key={router.asPath} className={`${styles.content} al-rise`}>
          {children}
        </div>
      </main>
    </div>
  );
}
