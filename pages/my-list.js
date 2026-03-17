import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import styles from '../styles/my-list.module.css';
import useMyList from '../hooks/useMyList';
import useAuth from '../hooks/useAuth';

export default function MyList() {
  const { list, removeItem, hasLoaded } = useMyList();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [authLoading, router, user]);

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - My List"
      description="Your personal anime watchlist and favorites in one place."
    >
      <main className={styles.main}>
        {!user ? (
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>Redirecting…</h2>
            <p className={styles.emptySubtitle}>Please log in to view your list.</p>
          </div>
        ) : (
          <>
            <section className={styles.header}>
              <div>
                <div className={styles.eyebrow}>My List</div>
                <h1 className={styles.title}>Your watchlist lives here</h1>
                <p className={styles.subtitle}>
                  Start curating favorites on the home page or movies tab to see them appear here.
                </p>
              </div>
            </section>
            {hasLoaded && list.length === 0 ? (
              <div className={styles.emptyCard}>
                <h2 className={styles.emptyTitle}>No titles yet</h2>
                <p className={styles.emptySubtitle}>
                  Browse the home page and add a few series or films.
                </p>
              </div>
            ) : (
              <section className={styles.grid}>
                {list.map((item, index) => (
                  <div
                    key={item.id}
                    className={styles.listCard}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <Link href={`/anime/${item.id}`} legacyBehavior>
                      <a className={styles.cardLink}>
                        <div className={styles.poster}>
                          {item.image ? (
                            <Image
                              className={styles.posterImage}
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="200px"
                            />
                          ) : null}
                        </div>
                        <div className={styles.info}>
                          <div className={styles.cardTitle}>{item.title}</div>
                          <div className={styles.meta}>
                            <span>{item.type || 'Series'}</span>
                            <span>{item.year || '-'}</span>
                            <span>{item.score ? `${item.score}` : 'NR'}</span>
                          </div>
                        </div>
                      </a>
                    </Link>
                    <button
                      className={styles.removeButton}
                      type="button"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
