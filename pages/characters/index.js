import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import IconButton from '../../components/ui/IconButton';
import { getTopCharacters } from '../../lib/services/jikan';
import styles from './index.module.css';

const posterFrom = (character) =>
  character?.images?.webp?.image_url ||
  character?.images?.jpg?.image_url ||
  '/logo_no_text.png';

export default function CharactersIndexPage({ items, pagination, page }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/characters', query: { page: p } });

  return (
    <Layout title="AnimeLegacy · Characters" description="Browse the most popular anime characters by fan favorites.">
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>CATALOGUE</div>
          <h1 className={styles.heading}>
            Top <span className={styles.highlight}>characters</span>
          </h1>
          <p className={styles.subtitle}>
            The most favorited characters across every anime ever catalogued. Click for bios,
            appearances, and voice actors.
          </p>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>No data available</h2>
            <p>The Jikan API is not responding. Try again in a moment.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((c) => (
              <Link key={c.mal_id} href={`/characters/${c.mal_id}`} className={styles.card}>
                <div className={styles.posterWrap}>
                  <Image
                    src={posterFrom(c)}
                    alt={c.name || 'Character'}
                    fill
                    sizes="(max-width: 768px) 40vw, 200px"
                    className={styles.poster}
                  />
                  <div className={styles.posterGradient} />
                  {typeof c.favorites === 'number' ? (
                    <div className={styles.favBadge}>
                      <span className={styles.favNum}>
                        {c.favorites.toLocaleString()}
                      </span>
                      <span className={styles.favLabel}>fans</span>
                    </div>
                  ) : null}
                </div>
                <div className={styles.meta}>
                  <div className={styles.name}>{c.name || 'Unknown'}</div>
                  {c.name_kanji ? (
                    <div className={styles.kanji}>{c.name_kanji}</div>
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
  const response = await getTopCharacters(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};
  return { props: { items, pagination, page } };
}
