import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import IconButton from '../components/ui/IconButton';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { getTopAnimeMovies } from '../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../lib/utils/anime';
import { getAnimeImageUrl } from '../lib/utils/media';
import styles from './movies.module.css';

function MoviesPage({ items, pagination, page, aniListMap, t }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/movies', query: { page: p } });

  return (
    <Layout title={t('movies.metaTitle')} description={t('movies.metaDesc')}>
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>{t('movies.eyebrow')}</div>
          <h1 className={styles.heading}>
            {t('movies.titleStart')}{' '}
            <span className={styles.highlight}>{t('movies.titleEnd')}</span>
          </h1>
          <p className={styles.subtitle}>{t('movies.subtitle')}</p>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>{t('movies.emptyTitle')}</h2>
            <p>{t('movies.emptyBody')}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((movie) => {
              const media = aniListMap?.[movie.mal_id];
              const imageUrl = getAnimeImageUrl(movie, media);
              const year = movie.year || movie.aired?.prop?.from?.year || null;
              const score = typeof movie.score === 'number' ? movie.score : null;
              return (
                <Link
                  key={movie.mal_id}
                  href={`/anime/${movie.mal_id}`}
                  className={styles.card}
                >
                  <div className={styles.posterWrap}>
                    <Image
                      src={imageUrl || '/logo_no_text.png'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 45vw, 220px"
                      className={styles.poster}
                    />
                    <div className={styles.posterGradient} />
                    {score !== null ? (
                      <div className={styles.scoreBadge}>
                        <Star size={11} fill="currentColor" strokeWidth={0} />
                        {score.toFixed(1)}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.title}>{movie.title}</div>
                    <div className={styles.sub}>
                      {year || '—'}
                      {movie.duration ? ` · ${movie.duration}` : ''}
                    </div>
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

export default translate(MoviesPage);

export async function getServerSideProps(context) {
  const page = Math.max(1, Number.parseInt(context.query?.page, 10) || 1);
  const response = await getTopAnimeMovies(page);
  const filtered = Array.isArray(response?.data)
    ? dedupeByMalId(filterOutHentai(response.data))
    : [];
  const pagination = response?.pagination || {};
  const ids = filtered.map((item) => item.mal_id).filter(Boolean);
  const aniListMap = await fetchAniListMediaByMalIds(ids);
  return { props: { items: filtered, pagination, page, aniListMap } };
}
