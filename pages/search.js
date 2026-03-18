import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AddToListModal from '../components/modals/AddToListModal';
import styles from '../styles/search.module.css';
import useMyList from '../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { searchAnime, slimAnimeResponse } from '../lib/services/jikan';
import { getAnimeImageUrl } from '../lib/utils/media';

export default function Search({ query, page, results, pagination }) {
  const router = useRouter();
  const { addItem, isInList, getEntry, canEdit, favoritesCount } = useMyList();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const items = Array.isArray(results?.data) ? results.data : [];
  const total = pagination?.items?.total || items.length;
  const lastPage = pagination?.last_visible_page || 1;

  const titleQuery = query ? `"${query}"` : 'your search';
  const hasResults = items.length > 0;

  const buildLink = (nextPage) => ({
    pathname: '/search',
    query: { q: query, page: nextPage },
  });

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

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title={`AnimeLegacy - Search Results for ${query || 'Anime'}`}
      description="Search results from AnimeLegacy."
    >
      <main className={styles.main}>
        <section className={styles.heroPanel}>
          <div className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>Search</div>
              <h1 className={styles.title}>
                Results for <span>{titleQuery}</span>
              </h1>
              <p className={styles.subtitle}>
                {query
                  ? `Showing ${total} result${total === 1 ? '' : 's'} for your search.`
                  : 'Type a title in the search bar to discover anime.'}
              </p>
            </div>
            {query ? (
              <button className={styles.backButton} type="button" onClick={() => router.back()}>
                Back
              </button>
            ) : null}
          </div>
        </section>

        <section className={styles.section}>
          {hasResults ? (
            <div className={styles.grid}>
              {items.map((element, index) => {
                const imageUrl = getAnimeImageUrl(element);
                const normalized = normalizeAnime(element);
                return (
                  <div
                    key={element.mal_id || `${element.title}-${index}`}
                    className={styles.card}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                      <a className={styles.cardLink}>
                        <div className={styles.poster}>
                          <Image
                            className={styles.posterImage}
                            src={imageUrl || '/logo_no_text.png'}
                            alt={element.title || 'Anime'}
                            fill
                            sizes="200px"
                          />
                          <span className={styles.score}>{element.score || 'NR'}</span>
                        </div>
                        <div className={styles.cardTitle}>{element.title}</div>
                        <div className={styles.cardMeta}>
                          <span>{element.type || 'TV'}</span>
                          <span>{element.year || element?.aired?.prop?.from?.year || 'TBA'}</span>
                          <span>{element.episodes ? `${element.episodes} eps` : 'Ongoing'}</span>
                        </div>
                      </a>
                    </Link>
                    {!canEdit ? (
                      <button className={styles.listButton} type="button" disabled>
                        Login to Add
                      </button>
                    ) : normalized && isInList(normalized.id) ? (
                      <div className={styles.listActions}>
                        <Link href="/my-list" legacyBehavior>
                          <a className={`${styles.listButton} ${styles.listLink}`}>In My List</a>
                        </Link>
                        <button
                          className={`${styles.listButton} ${styles.editButton}`}
                          type="button"
                          onClick={() => openAddModal(normalized, getEntry(normalized.id))}
                        >
                          <i className={`bi bi-pencil ${styles.editIcon}`} aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.listButton}
                        type="button"
                        onClick={() => openAddModal(normalized)}
                      >
                        Add to List
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h2>No results yet</h2>
              <p>Try a different title, or check your spelling.</p>
            </div>
          )}
        </section>

        {hasResults ? (
          <section className={styles.pagination} aria-label="Pagination">
            <Link href={buildLink(Math.max(1, page - 1))} legacyBehavior>
              <a
                className={`${styles.pageButton} ${page === 1 ? styles.pageButtonDisabled : ''}`}
                aria-disabled={page === 1}
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </a>
            </Link>
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => i + 1).map((pageNumber) => (
              <Link key={pageNumber} href={buildLink(pageNumber)} legacyBehavior>
                <a
                  className={`${styles.pageButton} ${page === pageNumber ? styles.pageButtonActive : ''}`}
                >
                  {pageNumber}
                </a>
              </Link>
            ))}
            {lastPage > 5 ? <span className={styles.pageEllipsis}>...</span> : null}
            {lastPage > 5 ? (
              <Link href={buildLink(lastPage)} legacyBehavior>
                <a
                  className={`${styles.pageButton} ${page === lastPage ? styles.pageButtonActive : ''}`}
                >
                  {lastPage}
                </a>
              </Link>
            ) : null}
            <Link href={buildLink(Math.min(lastPage, page + 1))} legacyBehavior>
              <a
                className={`${styles.pageButton} ${page === lastPage ? styles.pageButtonDisabled : ''}`}
                aria-disabled={page === lastPage}
              >
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </a>
            </Link>
          </section>
        ) : null}
      </main>
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

export async function getServerSideProps(context) {
  const query = typeof context.query?.q === 'string' ? context.query.q.trim() : '';
  const page = Number.parseInt(context.query?.page, 10) || 1;

  if (!query) {
    return {
      props: {
        query: '',
        page: 1,
        results: { data: [] },
        pagination: {},
      },
    };
  }

  try {
    const response = await searchAnime(query, page, 21);
    const filtered = Array.isArray(response?.data) ? filterOutHentai(response.data) : [];
    const results = slimAnimeResponse({ data: filtered });
    const pagination = response?.pagination || {};

    return {
      props: {
        query,
        page,
        results,
        pagination,
      },
    };
  } catch {
    return {
      props: {
        query,
        page,
        results: { data: [] },
        pagination: {},
      },
    };
  }
}
