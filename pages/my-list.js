import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Search,
  Trash2,
  Star,
  Pencil,
  Plus,
  Check,
  Pause,
  Play,
  XCircle,
  List as ListIcon,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import IconButton from '../components/ui/IconButton';
import StatusBadge from '../components/ui/StatusBadge';
import Skeleton from '../components/ui/Skeleton';
import AddToListModal from '../components/modals/AddToListModal';
import RatingReviewModal from '../components/modals/RatingReviewModal';
import styles from './my-list.module.css';
import useMyList from '../hooks/useMyList';
import useAuth from '../hooks/useAuth';
import useProfileData from '../hooks/useProfileData';
import { getFirebaseClient } from '../lib/firebase/client';
import { isAiringAnime } from '../lib/utils/anime';
import { getSeasonFromDate } from '../lib/utils/season';
import { FAVORITE_LIMIT, FAVORITE_LIMIT_MESSAGE } from '../lib/constants';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'watching', label: 'Watching' },
  { id: 'completed', label: 'Completed' },
  { id: 'plan', label: 'Plan to watch' },
  { id: 'on_hold', label: 'On hold' },
  { id: 'dropped', label: 'Dropped' },
];

const STATUS_ICONS = {
  watching: Play,
  completed: Check,
  plan: Plus,
  on_hold: Pause,
  hold: Pause,
  dropped: XCircle,
};

export default function MyList() {
  const { list, removeItem, addItem, hasLoaded, favoritesCount } = useMyList();
  const { user, loading: authLoading } = useAuth();
  const { animeItems, stats } = useProfileData(user?.uid);
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list');
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
    if (!user) router.replace('/sign-in');
  }, [authLoading, router, user]);

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
    const counts = { all: 0, watching: 0, completed: 0, plan: 0, on_hold: 0, dropped: 0 };
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
    const matchesSearch = (item) => !term || String(item.title || '').toLowerCase().includes(term);
    const matchesStatus = (item) => {
      const detail = detailsById.get(String(item.id)) || {};
      const rawStatus = detail.status || 'plan';
      const isAiring = isAiringNow(detail, item);
      const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'on_hold') return status === 'on_hold' || status === 'hold';
      return status === activeFilter;
    };
    return list.filter((item) => matchesSearch(item) && matchesStatus(item));
  }, [list, searchTerm, activeFilter, detailsById, isAiringNow]);

  const orderedList = useMemo(() => {
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
        if (activeFilter !== 'all') {
          if (a.status === 'completed' && b.status === 'completed' && a.rating !== b.rating) {
            return b.rating - a.rating;
          }
          return a.index - b.index;
        }
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
    if (currentPage > totalPages) setCurrentPage(totalPages);
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
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
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
      unsubscribers.forEach((u) => u && u());
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
    if (normalizedStatus === 'plan' || normalizedStatus === 'on_hold') {
      await addItem(anime, { status: 'watching', progress: currentProgress, keepAddedAt: true });
      return;
    }
    if (normalizedStatus === 'dropped') {
      await addItem(anime, { status: 'on_hold', progress: currentProgress, keepAddedAt: true });
      return;
    }
    if (normalizedStatus === 'watching') {
      const maxProgress = isAiring && totalEpisodes ? Math.max(totalEpisodes - 1, 0) : totalEpisodes;
      const nextProgress = maxProgress ? Math.min(maxProgress, currentProgress + 1) : currentProgress + 1;
      if (!isAiring && totalEpisodes && nextProgress >= totalEpisodes) {
        await addItem(anime, { status: 'completed', progress: totalEpisodes, keepAddedAt: true });
        return;
      }
      await addItem(anime, { status: 'watching', progress: nextProgress, keepAddedAt: true });
    }
  };
  const handleToggleFavorite = async (anime, detail, status) => {
    const isFavorite = Boolean(detail?.isFavorite);
    if (!isFavorite && favoritesCount >= FAVORITE_LIMIT) {
      setFavoriteWarning(FAVORITE_LIMIT_MESSAGE);
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

  const renderListRow = (item, detail, status, isAiring) => {
    const progress = typeof detail.progress === 'number' ? detail.progress : 0;
    const total = detail.episodesTotal || item.episodes || 0;
    const displayProgress = isAiring && total > 0 ? Math.min(progress, Math.max(total - 1, 0)) : progress;
    const pct = total > 0 ? Math.min(100, (displayProgress / total) * 100) : 0;
    const isFavorite = Boolean(detail?.isFavorite);
    const favoriteLimitReached = favoritesCount >= FAVORITE_LIMIT && !isFavorite;
    const StatusIcon = STATUS_ICONS[status] || Plus;
    return (
      <div key={item.id} className={styles.row}>
        <Link href={`/anime/${item.id}`} className={styles.rowLink}>
          <div className={styles.rowPoster}>
            {item.image ? (
              <Image src={item.image} alt={item.title} fill sizes="72px" className={styles.posterImg} />
            ) : null}
          </div>
          <div className={styles.rowMain}>
            <div className={styles.rowTitleLine}>
              <div className={styles.rowTitle}>{item.title}</div>
              {isFavorite ? <Star size={13} strokeWidth={1.5} className={styles.favIcon} /> : null}
            </div>
            <div className={styles.rowMeta}>
              <span className={styles.eyebrowInline}>{item.type || 'TV'}</span>
              <span className={styles.dotSep} />
              <span className={styles.num}>
                {item.season ? `${item.season} ` : ''}{item.year || '—'}
              </span>
              {item.episodes ? (
                <>
                  <span className={styles.dotSep} />
                  <span className={styles.num}>{item.episodes} ep</span>
                </>
              ) : null}
            </div>
            <div className={styles.rowProgressRow}>
              <StatusBadge status={status} size="xs" />
              <div className={styles.rowProgressTrackWrap}>
                <div className={styles.rowProgressTrack}>
                  <div
                    className={`${styles.rowProgressFill} ${status === 'completed' ? styles.rowProgressFillCompleted : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={styles.rowProgressLabel}>
                  {displayProgress}/{total || '?'}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.rowRight}>
            {typeof detail.rating === 'number' ? (
              <div className={styles.yourScore}>
                <div className={styles.yourScoreLabel}>Your score</div>
                <div className={styles.yourScoreNum}>{Number(detail.rating.toFixed(1))}</div>
              </div>
            ) : null}
          </div>
        </Link>
        <div className={styles.rowActions}>
          <IconButton
            icon={Trash2}
            tooltip="Remove from list"
            onClick={() => removeItem(item.id)}
          />
          {status === 'completed' ? (
            <IconButton
              icon={Star}
              tooltip={isFavorite ? 'Remove favorite' : 'Favorite'}
              active={isFavorite}
              disabled={favoriteLimitReached}
              onClick={() => handleToggleFavorite(item, detail, detail.status || 'completed')}
            />
          ) : null}
          <IconButton
            icon={StatusIcon}
            tooltip={status === 'completed' ? 'Rate' : 'Advance'}
            onClick={() =>
              status === 'completed'
                ? openRatingModal(item, detail)
                : handleStatusAction(item, detail, status)
            }
          />
          <IconButton icon={Pencil} tooltip="Edit" onClick={() => openEditModal(item, detail)} />
        </div>
      </div>
    );
  };

  const renderGridCard = (item, detail, status, isAiring) => {
    const progress = typeof detail.progress === 'number' ? detail.progress : 0;
    const total = detail.episodesTotal || item.episodes || 0;
    const displayProgress = isAiring && total > 0 ? Math.min(progress, Math.max(total - 1, 0)) : progress;
    const pct = total > 0 ? Math.min(100, (displayProgress / total) * 100) : 0;
    return (
      <Link key={item.id} href={`/anime/${item.id}`} className={styles.gridCard}>
        <div className={styles.gridPoster}>
          {item.image ? (
            <Image src={item.image} alt={item.title} fill sizes="180px" className={styles.posterImg} />
          ) : null}
          <div className={styles.gridGradient} />
          {detail?.isFavorite ? (
            <div className={styles.gridFav}>
              <Star size={12} strokeWidth={1.5} fill="currentColor" />
            </div>
          ) : null}
          <div className={styles.gridStatus}>
            <StatusBadge status={status} size="xs" />
          </div>
        </div>
        <div className={styles.gridMeta}>
          <div className={styles.gridTitle}>{item.title}</div>
          <div className={styles.gridSub}>
            <span>{item.type || 'TV'}</span>
            <span className={styles.dotSep} />
            <span className={styles.num}>{item.year || '—'}</span>
          </div>
          <div className={styles.gridTrack}>
            <div
              className={`${styles.gridFill} ${status === 'completed' ? styles.gridFillCompleted : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className={styles.gridProgress}>
            <span className={styles.num}>{displayProgress}/{total || '?'}</span>
            {typeof detail.rating === 'number' ? (
              <span className={styles.gridRating}>
                <Star size={10} strokeWidth={1.5} fill="currentColor" />
                {detail.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Layout
      title="AnimeLegacy · My list"
      description="Your personal anime watchlist and favorites."
    >
      <div className={styles.page}>
        {!user ? (
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>Redirecting…</h2>
            <p className={styles.emptySubtitle}>Please log in to view your list.</p>
          </div>
        ) : (
          <>
            <header className={styles.pageHead}>
              <div className={styles.headInfo}>
                <div className={styles.eyebrow}>PERSONAL CHRONICLE</div>
                <h1 className={styles.heading}>My list</h1>
                <p className={styles.subtitle}>
                  {stats?.watched ? (
                    <>
                      <strong className={styles.statsNum}>{stats.watched}</strong> completed ·{' '}
                      <strong className={styles.statsNum}>{stats.hours || 0}h</strong> watched
                      {typeof stats.meanScore === 'number' ? (
                        <>
                          {' · '}mean score{' '}
                          <strong className={styles.statsMean}>{stats.meanScore.toFixed(2)}</strong>
                        </>
                      ) : null}
                    </>
                  ) : (
                    'Manage and track your anime journey across all formats.'
                  )}
                </p>
              </div>
              <div className={styles.headActions}>
                <div className={styles.searchBox}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search your list…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>
            </header>

            <div className={styles.tabs} role="tablist">
              {FILTERS.map((f) => {
                const active = activeFilter === f.id;
                const count = statusCounts[f.id] ?? 0;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                    onClick={() => {
                      setActiveFilter(f.id);
                      setCurrentPage(1);
                    }}
                  >
                    {f.label}
                    <span className={`${styles.tabCount} ${active ? styles.tabCountActive : ''}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.toolbar}>
              <div className={styles.eyebrowInline}>{orderedList.length} TITLES</div>
              <div className={styles.viewSwitcher}>
                <IconButton
                  icon={ListIcon}
                  tooltip="List view"
                  active={view === 'list'}
                  size={32}
                  onClick={() => setView('list')}
                />
                <IconButton
                  icon={LayoutGrid}
                  tooltip="Grid view"
                  active={view === 'grid'}
                  size={32}
                  onClick={() => setView('grid')}
                />
              </div>
            </div>

            {favoriteWarning ? (
              <div className={styles.warning} role="status" aria-live="polite">
                <AlertTriangle size={14} />
                <span>{favoriteWarning}</span>
              </div>
            ) : null}

            {!hasLoaded ? (
              view === 'list' ? (
                <div className={styles.listStack}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} variant="row" />
                  ))}
                </div>
              ) : (
                <div className={styles.grid}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} variant="poster" />
                  ))}
                </div>
              )
            ) : orderedList.length === 0 ? (
              <div className={styles.emptyCard}>
                <h2 className={styles.emptyTitle}>No titles yet</h2>
                <p className={styles.emptySubtitle}>
                  Browse the <Link href="/">home page</Link> and add a few series or films.
                </p>
              </div>
            ) : view === 'list' ? (
              <div className={styles.listStack}>
                {pagedList.map((item) => {
                  const detail = detailsById.get(String(item.id)) || {};
                  const rawStatus = detail.status || 'plan';
                  const isAiring = isAiringNow(detail, item);
                  const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
                  return renderListRow(item, detail, status, isAiring);
                })}
              </div>
            ) : (
              <div className={styles.grid}>
                {pagedList.map((item) => {
                  const detail = detailsById.get(String(item.id)) || {};
                  const rawStatus = detail.status || 'plan';
                  const isAiring = isAiringNow(detail, item);
                  const status = isAiring && rawStatus === 'completed' ? 'watching' : rawStatus;
                  return renderGridCard(item, detail, status, isAiring);
                })}
              </div>
            )}

            {totalPages > 1 ? (
              <div className={styles.pagination}>
                <IconButton
                  icon={ChevronLeft}
                  tooltip="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                />
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                {totalPages > 5 ? <span className={styles.pageDots}>…</span> : null}
                {totalPages > 5 ? (
                  <button
                    type="button"
                    className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                ) : null}
                <IconButton
                  icon={ChevronRight}
                  tooltip="Next page"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

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
