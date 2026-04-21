import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import IconButton from '../../components/ui/IconButton';
import { getTopPeople } from '../../lib/services/jikan';
import styles from './index.module.css';

const posterFrom = (person) =>
  person?.images?.webp?.image_url ||
  person?.images?.jpg?.image_url ||
  '/logo_no_text.png';

export default function VoicesIndexPage({ items, pagination, page }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/voices', query: { page: p } });

  return (
    <Layout title="AnimeLegacy · Voice actors" description="Most favorited voice actors and their work.">
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>CATALOGUE</div>
          <h1 className={styles.heading}>
            Top <span className={styles.highlight}>voice actors</span>
          </h1>
          <p className={styles.subtitle}>
            The most beloved seiyuu and international voice actors. Click through for their
            filmography and roles.
          </p>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>No data available</h2>
            <p>The Jikan API is not responding. Try again in a moment.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((p) => (
              <Link key={p.mal_id} href={`/voices/${p.mal_id}`} className={styles.card}>
                <div className={styles.avatarWrap}>
                  <Image
                    src={posterFrom(p)}
                    alt={p.name || 'Voice actor'}
                    fill
                    sizes="(max-width: 768px) 40vw, 200px"
                    className={styles.avatar}
                  />
                  <div className={styles.avatarGradient} />
                  {typeof p.favorites === 'number' ? (
                    <div className={styles.favBadge}>
                      <span className={styles.favNum}>
                        {p.favorites.toLocaleString()}
                      </span>
                      <span className={styles.favLabel}>fans</span>
                    </div>
                  ) : null}
                </div>
                <div className={styles.meta}>
                  <div className={styles.name}>{p.name || 'Unknown'}</div>
                  {p.given_name || p.family_name ? (
                    <div className={styles.sub}>
                      {[p.given_name, p.family_name].filter(Boolean).join(' ')}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
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
  const response = await getTopPeople(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};
  return { props: { items, pagination, page } };
}
