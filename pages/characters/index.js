import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import IconButton from '../../components/ui/IconButton';
import { getTopCharacters } from '../../lib/services/jikan';
import styles from './index.module.css';

const posterFrom = (character) =>
  character?.images?.webp?.image_url ||
  character?.images?.jpg?.image_url ||
  '/logo_no_text.png';

function CharactersIndexPage({ items, pagination, page, t }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/characters', query: { page: p } });

  return (
    <Layout title={t('characters.metaTitle')} description={t('characters.metaDesc')}>
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>{t('characters.eyebrow')}</div>
          <h1 className={styles.heading}>
            {t('characters.titleStart')}{' '}
            <span className={styles.highlight}>{t('characters.titleEnd')}</span>
          </h1>
          <p className={styles.subtitle}>{t('characters.subtitle')}</p>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>{t('characters.emptyTitle')}</h2>
            <p>{t('characters.emptyBody')}</p>
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
                      <span className={styles.favNum}>{c.favorites.toLocaleString()}</span>
                      <span className={styles.favLabel}>{t('characters.fans')}</span>
                    </div>
                  ) : null}
                </div>
                <div className={styles.meta}>
                  <div className={styles.name}>{c.name || t('status.unknown')}</div>
                  {c.name_kanji ? <div className={styles.kanji}>{c.name_kanji}</div> : null}
                </div>
              </Link>
            ))}
          </div>
        )}

        {lastPage > 1 ? (
          <div className={styles.pagination}>
            <IconButton
              icon={ChevronLeft}
              tooltip={t('actions.previousPage')}
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
              tooltip={t('actions.nextPage')}
              disabled={page === lastPage}
              onClick={() => go(Math.min(lastPage, page + 1))}
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

export default translate(CharactersIndexPage);

export async function getServerSideProps(context) {
  const page = Math.max(1, Number.parseInt(context.query?.page, 10) || 1);
  const response = await getTopCharacters(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};
  return { props: { items, pagination, page } };
}
