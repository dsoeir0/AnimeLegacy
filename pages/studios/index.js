import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
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

function StudiosIndexPage({ items, pagination, page, t }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/studios', query: { page: p } });

  return (
    <Layout title={t('studios.metaTitle')} description={t('studios.metaDesc')}>
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>{t('studios.eyebrow')}</div>
          <h1 className={styles.heading}>
            {t('studios.titleStart')} <span className={styles.highlight}>{t('studios.titleEnd')}</span>
          </h1>
          <p className={styles.subtitle}>{t('studios.subtitle')}</p>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>{t('studios.emptyTitle')}</h2>
            <p>{t('studios.emptyBody')}</p>
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
                      <span>{t('studios.titlesCount', { n: s.count || 0 })}</span>
                      <span className={styles.dot} />
                      <span>
                        {t('studios.fansCount', {
                          n: typeof s.favorites === 'number' ? s.favorites.toLocaleString() : 0,
                        })}
                      </span>
                    </div>
                    {s.established ? (
                      <div className={styles.est}>
                        {t('studios.established', { year: new Date(s.established).getFullYear() })}
                      </div>
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

export default translate(StudiosIndexPage);

export async function getServerSideProps(context) {
  const page = Math.max(1, Number.parseInt(context.query?.page, 10) || 1);
  const response = await getProducers(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};
  return { props: { items, pagination, page } };
}
