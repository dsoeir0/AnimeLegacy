import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import Layout from '../components/layout/Layout';
import AddToListModal from '../components/modals/AddToListModal';
import RatingReviewModal from '../components/modals/RatingReviewModal';
import styles from '../styles/my-list.module.css';
import useMyList from '../hooks/useMyList';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { getFirebaseClient } from '../lib/firebase/client';
import { isAiringAnime } from '../lib/utils/anime';
import { getSeasonFromDate } from '../lib/utils/season';

export default function MyList() {
  const { list, removeItem, addItem, hasLoaded, favoritesCount } = useMyList();
  const { user, loading: authLoading } = useAuth();
  const { animeItems } = useProfileData(user?.uid);
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [pendingAiring, setPendingAiring] = useState(undefined);
  const [favoriteWarning, setFavoriteWarning] = useState('');
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingAnime, setRatingAnime] = useState(null);
  const [ratingEntry, setRatingEntry] = useState(null);
  const [catalogById, setCatalogById] = useState(() => new Map());
  const currentSeason = useMemo(() => getSeasonFromDate(), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const pageSize = 24;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/sign-in');
    }
  }, [authLoading, router, user]);

  const filters = useMemo(
    () => ['All', 'Currently Watching', 'Completed', 'Plan to Watch', 'On Hold', 'Dropped'],
    [],
  );

  const detailsById = useMemo(() => {
    const map = new Map();
    (animeItems || []).forEach((item) => {
      if (!item?.animeId) return;
      map.set(String(item.animeId), item);
    });
    return map;
  }, [animeItems]);

  const isAiringNow = (detail, item) => {
    const animeId = String(item?.id ?? detail?.animeId ?? '');
    const catalog = catalogById.get(animeId);
    const seasonLabel = String(item?.season ?? detail?.season ?? '').toLowerCase();
    const seasonHeuristic =
      Boolean(seasonLabel) &&
      Boolean(item?.year ?? detail?.year) &&
      seasonLabel === currentSeason &&
      Number(item?.year ?? detail?.year) === currentYear &&
      String(item?.type ?? detail?.type ?? '').toLowerCase().includes('tv');
    return (
      detail?.airing === true ||
      item?.airing === true ||
      isAiringAnime(detail) ||
      isAiringAnime(item) ||
      isAiringAnime(catalog) ||
      seasonHeuristic
    );
  };

  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      watching: 0,
      completed: 0,
      plan: 0,
      on_hold: 0,
      dropped: 0,
    };
    list.forEach((item) => {
      const detail = detailsById.get(String(item.id)) || {};
      const rawStatus = detail.status || 'plan';
      const isAiring = isAiringNow(detail, item);
      const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
      counts.all += 1;
      if (status === 'watching') counts.watching += 1;
      if (status === 'completed') counts.completed += 1;
      if (status === 'plan') counts.plan += 1;
      if (status === 'on_hold' || status === 'hold') counts.on_hold += 1;
      if (status === 'dropped') counts.dropped += 1;
    });
    return counts;
  }, [detailsById, isAiringNow, list]);

  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = (item) =>
      !term || String(item.title || '').toLowerCase().includes(term);

    const matchesStatus = (item) => {
      const detail = detailsById.get(String(item.id)) || {};
      const rawStatus = detail.status || 'plan';
      const isAiring = isAiringNow(detail, item);
      const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Currently Watching') return status === 'watching';
      if (activeFilter === 'Plan to Watch') return status === 'plan';
      if (activeFilter === 'Completed') return status === 'completed';
      if (activeFilter === 'Dropped') return status === 'dropped';
      if (activeFilter === 'On Hold') return status === 'on_hold' || status === 'hold';
      return true;
    };

    return list.filter((item) => matchesSearch(item) && matchesStatus(item));
  }, [list, searchTerm, activeFilter, detailsById, isAiringNow]);
  const orderedList = useMemo(() => {
    if (activeFilter === 'Completed') {
      return filteredList
        .map((item, index) => {
          const detail = detailsById.get(String(item.id)) || {};
          const rating = typeof detail.rating === 'number' ? detail.rating : -1;
          return { item, index, rating };
        })
        .sort((a, b) => (b.rating - a.rating) || (a.index - b.index))
        .map((entry) => entry.item);
    }
    if (activeFilter !== 'All') return filteredList;
    const statusRank = new Map([
      ['watching', 0],
      ['completed', 1],
      ['plan', 2],
      ['on_hold', 3],
      ['hold', 3],
      ['dropped', 4],
    ]);
    return filteredList
      .map((item, index) => {
        const detail = detailsById.get(String(item.id)) || {};
        const rawStatus = detail.status || 'plan';
        const isAiring = isAiringNow(detail, item);
        const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
        const rank = statusRank.has(status) ? statusRank.get(status) : 99;
        const rating = typeof detail.rating === 'number' ? detail.rating : -1;
        return { item, index, rank, status, rating };
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.status === 'completed' && b.status === 'completed' && a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }, [filteredList, activeFilter, detailsById, isAiringNow]);

  const totalPages = Math.max(1, Math.ceil(orderedList.length / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orderedList.slice(start, start + pageSize);
  }, [currentPage, orderedList]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    if (!db) {
      setCatalogById(new Map());
      return undefined;
    }
    const ids = list.map((item) => String(item?.id ?? '')).filter(Boolean);
    if (ids.length === 0) {
      setCatalogById(new Map());
      return undefined;
    }
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }
    const unsubscribers = chunks.map((chunk) =>
      onSnapshot(query(collection(db, 'anime'), where('animeId', 'in', chunk)), (snapshot) => {
        setCatalogById((prev) => {
          const next = new Map(prev);
          snapshot.docs.forEach((docItem) => {
            const data = docItem.data();
            if (!data?.animeId) return;
            next.set(String(data.animeId), data);
          });
          return next;
        });
      }),
    );
    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [list]);

  const openEditModal = (anime, entry) => {
    if (!anime) return;
    const detail = entry || detailsById.get(String(anime.id)) || {};
    setPendingAnime(anime);
    setPendingEntry(detail);
    setPendingAiring(isAiringNow(detail, anime));
    setAddModalOpen(true);
  };

  const closeEditModal = () => {
    setAddModalOpen(false);
    setPendingAnime(null);
    setPendingEntry(null);
    setPendingAiring(undefined);
  };

  const openRatingModal = (anime, detail) => {
    if (!anime) return;
    setRatingAnime(anime);
    setRatingEntry(detail || {});
    setRatingModalOpen(true);
  };

  const closeRatingModal = () => {
    setRatingModalOpen(false);
    setRatingAnime(null);
    setRatingEntry(null);
  };


  const handleConfirmEdit = async (details) => {
    if (!pendingAnime) return;
    await addItem(pendingAnime, { ...details, keepAddedAt: true });
    closeEditModal();
  };

  const handleSaveRating = async ({ rating, review }) => {
    if (!ratingAnime) return;
    const detail = ratingEntry || {};
    await addItem(ratingAnime, {
      status: detail.status || 'completed',
      progress: typeof detail.progress === 'number' ? detail.progress : 0,
      isFavorite: Boolean(detail.isFavorite),
      rating,
      review,
      keepAddedAt: true,
    });
    closeRatingModal();
  };


  const handleStatusAction = async (anime, detail, currentStatus) => {
    if (!anime) return;
    const isAiring = isAiringNow(detail, anime);
    const normalizedStatus = currentStatus === 'hold' ? 'on_hold' : currentStatus;
    const totalEpisodes = detail?.episodesTotal || anime?.episodes || 0;
    const currentProgress = typeof detail?.progress === 'number' ? detail.progress : 0;

    if (normalizedStatus === 'plan') {
      await addItem(anime, { status: 'watching', progress: currentProgress, keepAddedAt: true });
      return;
    }

    if (normalizedStatus === 'on_hold') {
      await addItem(anime, { status: 'watching', progress: currentProgress, keepAddedAt: true });
      return;
    }

    if (normalizedStatus === 'dropped') {
      await addItem(anime, { status: 'on_hold', progress: currentProgress, keepAddedAt: true });
      return;
    }

    if (normalizedStatus === 'watching') {
      const maxProgress =
        isAiring && totalEpisodes ? Math.max(totalEpisodes - 1, 0) : totalEpisodes;
      const nextProgress = maxProgress
        ? Math.min(maxProgress, currentProgress + 1)
        : currentProgress + 1;
      if (!isAiring && totalEpisodes && nextProgress >= totalEpisodes) {
        await addItem(anime, { status: 'completed', progress: totalEpisodes, keepAddedAt: true });
        return;
      }
      await addItem(anime, { status: 'watching', progress: nextProgress, keepAddedAt: true });
      return;
    }
  };

  const handleToggleFavorite = async (anime, detail, status) => {
    const isFavorite = Boolean(detail?.isFavorite);
    if (!isFavorite && favoritesCount >= 10) {
      setFavoriteWarning('You already have 10 favorites. Remove one to add another.');
      return;
    }
    setFavoriteWarning('');
    await addItem(anime, {
      status,
      progress: typeof detail?.progress === 'number' ? detail.progress : 0,
      isFavorite: !isFavorite,
      keepAddedAt: true,
    });
  };

  useEffect(() => {
    if (!favoriteWarning) return undefined;
    const timer = setTimeout(() => setFavoriteWarning(''), 4000);
    return () => clearTimeout(timer);
  }, [favoriteWarning]);


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
                <div className={styles.eyebrow}>Tracking Center</div>
                <h1 className={styles.title}>
                  My Anime <span>Library</span>
                </h1>
                <p className={styles.subtitle}>
                  Manage and track your anime journey across all formats. Stay updated on your progress.
                </p>
              </div>
              <div className={styles.headerActions}>
                <div className={styles.searchBox}>
                  <i className={`bi bi-search ${styles.searchIcon}`} aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search your list..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>
            </section>
            <div className={styles.filters}>
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={filter === activeFilter ? styles.filterActive : styles.filterButton}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                  <span className={styles.filterCount}>
                    {filter === 'All'
                      ? statusCounts.all
                      : filter === 'Currently Watching'
                      ? statusCounts.watching
                      : filter === 'Completed'
                      ? statusCounts.completed
                      : filter === 'Plan to Watch'
                      ? statusCounts.plan
                      : filter === 'On Hold'
                      ? statusCounts.on_hold
                      : statusCounts.dropped}
                  </span>
                </button>
              ))}
            </div>
            {favoriteWarning ? (
              <div className={styles.favoriteWarning} role="status" aria-live="polite">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>{favoriteWarning}</span>
              </div>
            ) : null}
            {hasLoaded && orderedList.length === 0 ? (
              <div className={styles.emptyCard}>
                <h2 className={styles.emptyTitle}>No titles yet</h2>
                <p className={styles.emptySubtitle}>
                  Browse the home page and add a few series or films.
                </p>
              </div>
            ) : (
              <section className={styles.grid}>
                {pagedList.map((item, index) => {
                  const detail = detailsById.get(String(item.id)) || {};
                  const rawStatus = detail.status || 'plan';
                  const isAiring = isAiringNow(detail, item);
                  const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
                  const isFavorite = Boolean(detail?.isFavorite);
                  const favoriteLimitReached = favoritesCount >= 10 && !isFavorite;
                  const progress = typeof detail.progress === 'number' ? detail.progress : 0;
                  const total = detail.episodesTotal || item.episodes || 0;
                  const userRating =
                    typeof detail.rating === 'number' ? Number(detail.rating.toFixed(1)) : null;
                  const userRatingLabel = typeof userRating === 'number' ? `${userRating}/5` : null;
                  const userRatingBadge = userRatingLabel ? `Your ${userRatingLabel}` : null;
                  const displayProgress =
                    isAiring && total > 0 ? Math.min(progress, Math.max(total - 1, 0)) : progress;
                  const percent =
                    total > 0 ? Math.min(100, Math.round((displayProgress / total) * 100)) : 0;
                  const progressLabel =
                    total > 0
                      ? `EP ${displayProgress} / ${total}`
                      : status === 'plan'
                      ? 'PLAN TO WATCH'
                      : 'EP 0 / 0';
                  const seasonValue = detail.season || item.season || '';
                  const yearValue = detail.year || item.year || '';
                  const seasonYear =
                    seasonValue && yearValue
                      ? `${seasonValue[0].toUpperCase()}${seasonValue.slice(1)} ${yearValue}`
                      : yearValue
                      ? `${yearValue}`
                      : seasonValue
                      ? `${seasonValue[0].toUpperCase()}${seasonValue.slice(1)}`
                      : '';
                  return (
                  <div
                    key={item.id}
                    className={`${styles.listCard} ${styles[`status-${status}`] || ''}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <Link href={`/anime/${item.id}`} legacyBehavior>
                      <a className={styles.cardLink}>
                        <div className={`${styles.poster} ${styles[`status-${status}`] || ''}`}>
                          {item.image ? (
                            <Image
                              className={styles.posterImage}
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="240px"
                            />
                          ) : null}
                          <div className={styles.posterBadges}>
                            <span className={styles.badge}>{item.type || 'TV'}</span>
                            <span className={styles.scoreBadge}>
                              {userRatingBadge || (item.score ? `MAL ${item.score}` : 'NR')}
                            </span>
                          </div>
                        </div>
                        <div className={styles.info}>
                          <div className={styles.cardTitle}>{item.title}</div>
                          <div className={styles.ratingMeta}>
                            {userRatingLabel ? `Your Rating: ${userRatingLabel}` : 'Your Rating: —'}
                          </div>
                          <div className={styles.meta}>
                            <span>{seasonYear || '-'}</span>
                            <span>{item.type || 'Series'}</span>
                          </div>
                          <div className={styles.progressRow}>
                            <span className={styles.progressLabel}>{progressLabel}</span>
                            <span className={styles.progressStatus}>
                              {status === 'watching'
                                ? 'WATCHING'
                                : status === 'completed'
                                ? 'COMPLETED'
                                : status === 'dropped'
                                ? 'DROPPED'
                                : status === 'on_hold' || status === 'hold'
                                ? 'ON HOLD'
                                : 'PLAN TO WATCH'}{' '}
                              {percent}%
                            </span>
                          </div>
                          <div className={styles.progressBar}>
                            <span
                              className={styles.progressFill}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </a>
                    </Link>
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.actionIconButton} ${styles.actionTrash}`}
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove from list"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                      <div className={styles.actionGroup}>
                        {status === 'completed' ? (
                          <button
                            className={`${styles.actionIconButton} ${styles.actionFavorite} ${isFavorite ? styles.actionFavoriteActive : ''} ${favoriteLimitReached ? styles.actionFavoriteDisabled : ''}`}
                            type="button"
                            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            aria-disabled={favoriteLimitReached}
                            onClick={() => handleToggleFavorite(item, detail, rawStatus)}
                          >
                            <i
                              className={isFavorite ? 'bi bi-star-fill' : 'bi bi-star'}
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}
                        <button
                          className={`${styles.actionIconButton} ${styles.actionStatus} ${styles[`action-${status}`] || ''}`}
                          type="button"
                          aria-label="Update status"
                          onClick={() =>
                            status === 'completed'
                              ? openRatingModal(item, detail)
                              : handleStatusAction(item, detail, status)
                          }
                        >
                          <i
                            className={
                              status === 'completed'
                                ? 'bi bi-check2'
                                : status === 'dropped'
                                ? 'bi bi-slash-circle'
                                : status === 'on_hold' || status === 'hold'
                                ? 'bi bi-pause'
                                : status === 'plan'
                                ? 'bi bi-play'
                                : 'bi bi-plus'
                            }
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          className={`${styles.actionIconButton} ${styles.actionGhost}`}
                          type="button"
                          aria-label="Edit entry"
                          onClick={() => openEditModal(item, detail)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                )})}
              </section>
            )}
            {totalPages > 1 ? (
              <div className={styles.pagination} aria-label="Pagination">
                <button
                  type="button"
                  className={styles.pageButton}
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`${styles.pageButton} ${currentPage === page ? styles.pageActive : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                {totalPages > 5 ? <span className={styles.pageDots}>...</span> : null}
                {totalPages > 5 ? (
                  <button
                    type="button"
                    className={`${styles.pageButton} ${currentPage === totalPages ? styles.pageActive : ''}`}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.pageButton}
                  aria-label="Next page"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
      <AddToListModal
        open={addModalOpen}
        anime={pendingAnime}
        onClose={closeEditModal}
        onConfirm={handleConfirmEdit}
        airingOverride={pendingAiring}
        initialStatus={pendingEntry?.status}
        initialProgress={pendingEntry?.progress}
        initialFavorite={pendingEntry?.isFavorite}
        initialRating={pendingEntry?.rating}
        initialReview={pendingEntry?.review}
        favoriteCount={favoritesCount}
        isEditing={Boolean(pendingEntry)}
      />
      <RatingReviewModal
        open={ratingModalOpen}
        anime={ratingAnime}
        initialRating={ratingEntry?.rating}
        initialReview={ratingEntry?.review}
        onClose={closeRatingModal}
        onSave={handleSaveRating}
      />
    </Layout>
  );
}
