import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import IconButton from '../../components/ui/IconButton';
import { getProducers } from '../../lib/services/jikan';
import styles from './index.module.css';

const pickName = (producer) => {
  if (!producer) return 'Unknown';
  const titles = Array.isArray(producer.titles) ? producer.titles : [];
  const preferred = titles.find((t) => t?.type === 'Default') || titles[0];
  return preferred?.title || producer.name || 'Unknown';
};

const studioInitials = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

export default function StudiosIndexPage({ items, pagination, page }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/studios', query: { page: p } });

  return (
    <Layout title="AnimeLegacy · Studios" description="Browse the studios behind your favorite anime.">
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>CATALOGUE</div>
          <h1 className={styles.heading}>
            Anime <span className={styles.highlight}>studios</span>
          </h1>
          <p className={styles.subtitle}>
            Every animation house catalogued — ranked by fan favorites. Click through for their
            signature works.
          </p>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>No data available</h2>
            <p>The Jikan API is not responding. Try again in a moment.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((s) => {
              const name = pickName(s);
              return (
                <Link key={s.mal_id} href={`/studios/${s.mal_id}`} className={styles.card}>
                  <div className={styles.mono}>{studioInitials(name)}</div>
                  <div className={styles.body}>
                    <div className={styles.name}>{name}</div>
                    <div className={styles.meta}>
                      <span>{s.count || 0} titles</span>
                      <span className={styles.dot} />
                      <span>{typeof s.favorites === 'number' ? s.favorites.toLocaleString() : 0} fans</span>
                    </div>
                    {s.established ? (
                      <div className={styles.est}>Est. {new Date(s.established).getFullYear()}</div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {lastPage > 1 ? (
          <div className={styles.pagination}>
            <IconButton
              icon={ChevronLeft}
              tooltip="Previous page"
              disabled={page === 1}
              onClick={() => go(Math.max(1, page - 1))}
            />
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
            {lastPage > 5 ? <span className={styles.pageDots}>…</span> : null}
            {lastPage > 5 ? (
              <button
                type="button"
                className={`${styles.pageBtn} ${page === lastPage ? styles.pageBtnActive : ''}`}
                onClick={() => go(lastPage)}
              >
                {lastPage}
              </button>
            ) : null}
            <IconButton
              icon={ChevronRight}
              tooltip="Next page"
              disabled={page === lastPage}
              onClick={() => go(Math.min(lastPage, page + 1))}
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const page = Math.max(1, Number.parseInt(context.query?.page, 10) || 1);
  const response = await getProducers(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};
  return { props: { items, pagination, page } };
}
