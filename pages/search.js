import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import HorizontalRow from '../components/cards/HorizontalRow';
import IconButton from '../components/ui/IconButton';
import Button from '../components/ui/Button';
import AddToListModal from '../components/modals/AddToListModal';
import styles from './search.module.css';
import useMyList from '../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { searchAnime, slimAnimeResponse } from '../lib/services/jikan';

function Search({ query, page, results, pagination, t }) {
  const router = useRouter();
  const { addItem, canEdit, favoritesCount, list } = useMyList();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const items = Array.isArray(results?.data) ? results.data : [];
  const total = pagination?.items?.total || items.length;
  const lastPage = pagination?.last_visible_page || 1;
  const hasResults = items.length > 0;

  const buildLink = (nextPage) => ({ pathname: '/search', query: { q: query, page: nextPage } });
  const openAddModal = (anime, entry = null) => {
    if (!anime) return;
    setPendingAnime(anime);
    setPendingEntry(entry);
    setAddModalOpen(true);
  };
  const closeAddModal = () => {
    setAddModalOpen(false);
    setPendingAnime(null);
    setPendingEntry(null);
  };
  const handleConfirmAdd = async (details) => {
    if (!pendingAnime) return;
    await addItem(pendingAnime, details);
    closeAddModal();
  };

  const entryFor = (mal_id) => list.find((e) => e.id === mal_id) || null;

  return (
    <Layout
      title={query ? t('search.metaTitle', { query }) : t('search.metaTitleFallback')}
      description={t('search.metaDesc')}
    >
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <div className={styles.eyebrow}>{t('search.eyebrow')}</div>
            <h1 className={styles.heading}>
              {query ? (
                <>
                  {t('search.resultsFor')}{' '}
                  <span className={styles.highlight}>&ldquo;{query}&rdquo;</span>
                </>
              ) : (
                t('search.startTitle')
              )}
            </h1>
            <p className={styles.subtitle}>
              {query ? t('search.foundBody', { n: total }) : t('search.startBody')}
            </p>
          </div>
          {query ? (
            <Button variant="ghost" size="md" onClick={() => router.back()}>
              {t('actions.back')}
            </Button>
          ) : null}
        </header>

        {hasResults ? (
          <>
            <div className={styles.resultsInfo}>
              <span className={styles.eyebrowInline}>
                {t('search.titlesOnPage', { n: items.length })}
              </span>
              <span className={styles.pageInfo}>
                {t('search.pageOf', { current: page, total: lastPage })}
              </span>
            </div>
            <div className={styles.list}>
              {items.map((element) => {
                const normalized = normalizeAnime(element);
                const entry = entryFor(element.mal_id);
                return (
                  <HorizontalRow
                    key={element.mal_id}
                    anime={element}
                    entry={entry}
                    href={`/anime/${element.mal_id}`}
                    onEdit={canEdit ? () => openAddModal(normalized, entry) : undefined}
                  />
                );
              })}
            </div>

            <div className={styles.pagination}>
              <Link href={buildLink(Math.max(1, page - 1))} className={styles.pageLink}>
                <IconButton icon={ChevronLeft} tooltip={t('actions.previousPage')} disabled={page === 1} />
              </Link>
              {Array.from({ length: Math.min(5, lastPage) }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={buildLink(p)} className={styles.pageLink}>
                  <button
                    type="button"
                    className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                  >
                    {p}
                  </button>
                </Link>
              ))}
              {lastPage > 5 ? <span className={styles.pageDots}>…</span> : null}
              {lastPage > 5 ? (
                <Link href={buildLink(lastPage)} className={styles.pageLink}>
                  <button
                    type="button"
                    className={`${styles.pageBtn} ${page === lastPage ? styles.pageBtnActive : ''}`}
                  >
                    {lastPage}
                  </button>
                </Link>
              ) : null}
              <Link href={buildLink(Math.min(lastPage, page + 1))} className={styles.pageLink}>
                <IconButton icon={ChevronRight} tooltip={t('actions.nextPage')} disabled={page === lastPage} />
              </Link>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <h2>{query ? t('search.emptyTitle') : t('search.startTitle')}</h2>
            <p>{query ? t('search.emptyBody') : t('search.startBody')}</p>
          </div>
        )}
      </div>
      <AddToListModal
        open={addModalOpen}
        anime={pendingAnime}
        onClose={closeAddModal}
        onConfirm={handleConfirmAdd}
        initialStatus={pendingEntry?.status}
        initialProgress={pendingEntry?.progress}
        initialFavorite={pendingEntry?.isFavorite}
        initialRating={pendingEntry?.rating}
        initialReview={pendingEntry?.review}
        favoriteCount={favoritesCount}
        isEditing={Boolean(pendingEntry)}
      />
    </Layout>
  );
}

export default translate(Search);

export async function getServerSideProps(context) {
  const query = typeof context.query?.q === 'string' ? context.query.q.trim() : '';
  const page = Number.parseInt(context.query?.page, 10) || 1;

  if (!query) {
    return { props: { query: '', page: 1, results: { data: [] }, pagination: {} } };
  }
  try {
    const response = await searchAnime(query, page, 21);
    const filtered = Array.isArray(response?.data) ? filterOutHentai(response.data) : [];
    const results = slimAnimeResponse({ data: filtered });
    const pagination = response?.pagination || {};
    return { props: { query, page, results, pagination } };
  } catch {
    return { props: { query, page, results: { data: [] }, pagination: {} } };
  }
}
