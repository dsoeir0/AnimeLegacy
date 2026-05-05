import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import HorizontalRow from '../components/cards/HorizontalRow';
import IconButton from '../components/ui/IconButton';
import AddToListModal from '../components/modals/AddToListModal';
import EditorialFeature from '../components/discover/EditorialFeature';
import MoodGrid from '../components/discover/MoodGrid';
import VibeFinder from '../components/discover/VibeFinder';
import HiddenGems from '../components/discover/HiddenGems';
import GenreRail from '../components/discover/GenreRail';
import { DISCOVER_MOODS } from '../components/discover/moods';
import styles from './search.module.css';
import useMyList from '../hooks/useMyList';
import { dedupeByMalId, filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { buildDiscoverPayload } from '../lib/utils/discoverPayload';
import {
  getAnimeByFilter,
  getAnimeGenres,
  getTopAnime,
  searchAnime,
  slimAnimeResponse,
} from '../lib/services/jikan';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';

const findMood = (id) => DISCOVER_MOODS.find((m) => m.id === id) || null;

function DiscoverPage({
  mode,
  query,
  page,
  results,
  pagination,
  activeGenre,
  activeMood,
  editorial,
  genres,
  t,
}) {
  const router = useRouter();
  const { addItem, canEdit, favoritesCount, list } = useMyList();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [inputValue, setInputValue] = useState(query || '');

  // Keep the input in sync when navigation happens (user clicks a mood
  // chip, clears via the filter chip, etc.).
  useEffect(() => {
    setInputValue(query || '');
  }, [query]);

  const items = Array.isArray(results?.data) ? results.data : [];
  const total = pagination?.items?.total || items.length;
  const lastPage = pagination?.last_visible_page || 1;

  const buildResultsLink = (nextPage) => ({
    pathname: '/search',
    query: {
      ...(query ? { q: query } : {}),
      ...(activeGenre ? { genre: activeGenre.mal_id } : {}),
      ...(activeMood ? { mood: activeMood.id } : {}),
      page: nextPage,
    },
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

  const entryFor = (mal_id) => list.find((e) => e.id === mal_id) || null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = inputValue.trim();
    router.push({
      pathname: '/search',
      query: value ? { q: value } : {},
    });
  };

  const clearOne = (key) => {
    const nextQuery = { ...router.query };
    delete nextQuery[key];
    delete nextQuery.page;
    router.push({ pathname: '/search', query: nextQuery });
  };

  const clearAll = () => router.push({ pathname: '/search' });

  const isSearchMode = mode === 'results';

  return (
    <Layout
      title={
        query
          ? t('search.metaTitle', { query })
          : t('discoverPage.metaTitle')
      }
      description={
        query ? t('search.metaDesc') : t('discoverPage.metaDesc')
      }
    >
      <div className={styles.page}>
        {/* ───── Header ───── */}
        <header className={styles.head}>
          <div>
            <div className={styles.eyebrow}>
              {t('discoverPage.eyebrow')}
            </div>
            {isSearchMode ? (
              <h1 className={styles.heading}>
                {t('search.resultsFor')}{' '}
                <span className={styles.highlight}>&ldquo;{query || activeGenre?.name || (activeMood ? t(activeMood.labelKey) : '')}&rdquo;</span>
              </h1>
            ) : (
              <>
                <h1 className={styles.heading}>
                  {t('discoverPage.headingPrefix')}{' '}
                  <span className={styles.headingAccent}>
                    {t('discoverPage.headingAccent')}
                  </span>
                  {t('discoverPage.headingSuffix')}
                </h1>
                <p className={styles.subtitle}>{t('discoverPage.subtitle')}</p>
              </>
            )}
          </div>

          <form className={styles.searchBox} onSubmit={handleSubmit}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('discoverPage.searchPlaceholder')}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              aria-label={t('discoverPage.searchLabel')}
            />
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </form>
        </header>

        {/* Active filter chips */}
        {(query || activeGenre || activeMood) ? (
          <div className={styles.activeFilters}>
            <span className={styles.activeLabel}>
              {t('discoverPage.activeLabel')}
            </span>
            {query ? (
              <span className={styles.chip}>
                &ldquo;{query}&rdquo;
                <button
                  type="button"
                  className={styles.chipClear}
                  onClick={() => clearOne('q')}
                  aria-label={t('actions.clear')}
                >
                  <X size={11} />
                </button>
              </span>
            ) : null}
            {activeMood ? (
              <span className={styles.chip}>
                <span
                  className={styles.chipSwatch}
                  style={{ background: activeMood.accent }}
                />
                {t(activeMood.labelKey)}
                <button
                  type="button"
                  className={styles.chipClear}
                  onClick={() => clearOne('mood')}
                  aria-label={t('actions.clear')}
                >
                  <X size={11} />
                </button>
              </span>
            ) : null}
            {activeGenre ? (
              <span className={styles.chip}>
                {activeGenre.name}
                <button
                  type="button"
                  className={styles.chipClear}
                  onClick={() => clearOne('genre')}
                  aria-label={t('actions.clear')}
                >
                  <X size={11} />
                </button>
              </span>
            ) : null}
            <button type="button" className={styles.clearAll} onClick={clearAll}>
              {t('discoverPage.clearAll')}
            </button>
          </div>
        ) : null}

        {/* ───── Results ───── */}
        {isSearchMode ? (
          items.length === 0 ? (
            <div className={styles.empty}>
              <h2>{t('search.emptyTitle')}</h2>
              <p>{t('search.emptyBody')}</p>
            </div>
          ) : (
            <>
              <div className={styles.resultsInfo}>
                <span className={styles.eyebrowInline}>
                  {t('search.titlesOnPage', { n: items.length })}
                </span>
                <span className={styles.pageInfo}>
                  {t('search.foundBody', { n: total })} ·{' '}
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
              {lastPage > 1 ? (
                <div className={styles.pagination}>
                  <Link href={buildResultsLink(Math.max(1, page - 1))} className={styles.pageLink}>
                    <IconButton icon={ChevronLeft} tooltip={t('actions.previousPage')} disabled={page === 1} />
                  </Link>
                  {Array.from({ length: Math.min(5, lastPage) }, (_, i) => i + 1).map((p) => (
                    <Link key={p} href={buildResultsLink(p)} className={styles.pageLink}>
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
                    <Link href={buildResultsLink(lastPage)} className={styles.pageLink}>
                      <button
                        type="button"
                        className={`${styles.pageBtn} ${page === lastPage ? styles.pageBtnActive : ''}`}
                      >
                        {lastPage}
                      </button>
                    </Link>
                  ) : null}
                  <Link href={buildResultsLink(Math.min(lastPage, page + 1))} className={styles.pageLink}>
                    <IconButton icon={ChevronRight} tooltip={t('actions.nextPage')} disabled={page === lastPage} />
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : (
          /* ───── Discover mode ───── */
          <>
            {editorial?.primary ? (
              <section className={styles.sectionTight}>
                <EditorialFeature
                  primary={editorial.primary}
                  secondary={editorial.secondary || []}
                />
              </section>
            ) : null}

            {editorial?.moodPosters ? (
              <section className={styles.section}>
                <MoodGrid postersByMood={editorial.moodPosters} />
              </section>
            ) : null}

            {editorial?.vibePool?.length ? (
              <section className={styles.section}>
                <VibeFinder pool={editorial.vibePool} />
              </section>
            ) : null}

            {editorial?.gems?.length ? (
              <section className={styles.section}>
                <HiddenGems gems={editorial.gems} />
              </section>
            ) : null}

            {genres?.length ? (
              <section className={styles.section}>
                <GenreRail genres={genres} />
              </section>
            ) : null}
          </>
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

export default translate(DiscoverPage);

export async function getServerSideProps(context) {
  const query = typeof context.query?.q === 'string' ? context.query.q.trim() : '';
  const page = Number.parseInt(context.query?.page, 10) || 1;
  const genreIdRaw = context.query?.genre;
  const genreId = Number.parseInt(genreIdRaw, 10);
  const moodId = typeof context.query?.mood === 'string' ? context.query.mood : null;

  // Genres catalogue is cheap + stable — always fetched for the active-
  // filter chip label lookup (and the discover-mode rail).
  const genresRes = await getAnimeGenres();
  const genres = (Array.isArray(genresRes?.data) ? genresRes.data : []).map((g) => ({
    mal_id: g.mal_id,
    name: g.name,
    count: g.count || 0,
  }));
  const activeGenre =
    Number.isFinite(genreId) ? genres.find((g) => g.mal_id === genreId) || null : null;
  const activeMood = moodId ? findMood(moodId) : null;

  // --- Results mode (query OR genre OR mood filter) ---
  const isResultsMode = Boolean(query || activeGenre || activeMood);
  if (isResultsMode) {
    let response;
    if (query) {
      try {
        response = await searchAnime(query, page, 21);
      } catch {
        response = { data: [], pagination: {} };
      }
    } else {
      response = await getAnimeByFilter({
        params: activeMood ? activeMood.query : `genres=${activeGenre.mal_id}&order_by=score&sort=desc`,
        page,
      });
    }
    const filtered = Array.isArray(response?.data)
      ? dedupeByMalId(filterOutHentai(response.data))
      : [];
    const results = slimAnimeResponse({ data: filtered });
    const pagination = response?.pagination || {};
    return {
      props: {
        mode: 'results',
        query,
        page,
        results,
        pagination,
        activeGenre,
        activeMood: activeMood
          ? { id: activeMood.id, labelKey: activeMood.labelKey, accent: activeMood.accent }
          : null,
        editorial: null,
        genres,
      },
    };
  }

  // --- Discover mode (no filters) ---
  // One Jikan call feeds every block below — `buildDiscoverPayload`
  // slices the top list into editorial/secondary/gems/vibePool/moods.
  const topRes = await getTopAnime('', 1);
  const topList = Array.isArray(topRes?.data) ? filterOutHentai(topRes.data) : [];
  const editorial = buildDiscoverPayload(topList);

  // MAL only ships ~225×320 posters. The Editorial hero and the Hidden
  // Gems banner cards render at 600–1200px wide, which made the MAL
  // fallback look heavily upscaled. Enrich the entries that drive those
  // big visuals with AniList's bannerImage (1920×500+) or
  // coverImage.extraLarge (~460×640+). Cached for 6h via _cache.js, so
  // SSR cost is one batched request the first time per content cycle.
  const heroIds = [
    editorial.primary?.mal_id,
    ...(editorial.secondary || []).map((a) => a?.mal_id),
    ...(editorial.gems || []).map((a) => a?.mal_id),
  ].filter(Boolean);

  if (heroIds.length > 0) {
    const aniListMap = await fetchAniListMediaByMalIds(heroIds);
    const enrich = (entry) => {
      if (!entry?.mal_id) return entry;
      const data = aniListMap[entry.mal_id];
      const banner = data?.bannerImage || data?.coverImage?.extraLarge || null;
      return banner ? { ...entry, banner } : entry;
    };
    if (editorial.primary) editorial.primary = enrich(editorial.primary);
    if (Array.isArray(editorial.secondary)) {
      editorial.secondary = editorial.secondary.map(enrich);
    }
    if (Array.isArray(editorial.gems)) {
      editorial.gems = editorial.gems.map(enrich);
    }
  }

  return {
    props: {
      mode: 'discover',
      query: '',
      page: 1,
      results: { data: [] },
      pagination: {},
      activeGenre: null,
      activeMood: null,
      editorial,
      genres,
    },
  };
}
