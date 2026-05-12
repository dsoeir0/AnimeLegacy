import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import HorizontalRow from '../components/cards/HorizontalRow';
import PosterCard from '../components/cards/PosterCard';
import IconButton from '../components/ui/IconButton';
import AddToListModal from '../components/modals/AddToListModal';
import EditorialFeature from '../components/discover/EditorialFeature';
import MoodGrid from '../components/discover/MoodGrid';
import VibeFinder from '../components/discover/VibeFinder';
import HiddenGems from '../components/discover/HiddenGems';
import GenreRail from '../components/discover/GenreRail';
import BecauseYouLiked from '../components/discover/BecauseYouLiked';
import SurpriseMe from '../components/discover/SurpriseMe';
import AiringThisWeek from '../components/discover/AiringThisWeek';
import FilterBanner from '../components/discover/FilterBanner';
import { DISCOVER_MOODS } from '../components/discover/moods';
import MobileSearch from '../components/search/MobileSearch';
import MobileCatalogue from '../components/search/MobileCatalogue';
import styles from './search.module.css';
import useMyList from '../hooks/useMyList';
import {
  dedupeByMalId,
  filterOutHentai,
  filterUnreleased,
  normalizeAnime,
  slimAnimeForDiscover,
} from '../lib/utils/anime';
import { buildDiscoverPayload } from '../lib/utils/discoverPayload';
import {
  applyExtraFilters,
  buildGenreQuery,
  normalizeDecade,
  normalizeScore,
  normalizeSort,
  normalizeStatus,
  normalizeType,
  normalizeView,
  overrideSort,
} from '../lib/utils/discoverFilter';
import {
  getAnimeByFilter,
  getAnimeGenres,
  getSchedules,
  getTopAnime,
  searchAnime,
  slimAnimeResponse,
} from '../lib/services/jikan';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { WEEKDAY_KEYS } from '../lib/utils/time';

const findMood = (id) => DISCOVER_MOODS.find((m) => m.id === id) || null;

function DiscoverPage({
  mode,
  query,
  page,
  results,
  pagination,
  activeGenres,
  activeMood,
  editorial,
  genres,
  schedulesByDay,
  sort,
  view,
  type,
  status,
  decade,
  minScore,
  kind,
  t,
}) {
  const router = useRouter();
  const { addItem, canEdit, favoritesCount, list } = useMyList();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [inputValue, setInputValue] = useState(query || '');
  const [viewMode, setViewMode] = useState(view || 'grid');

  useEffect(() => {
    setInputValue(query || '');
  }, [query]);

  useEffect(() => {
    if (view && view !== viewMode) setViewMode(view);
  }, [view]);

  const handleViewChange = (next) => {
    if (next === viewMode) return;
    setViewMode(next);
    const nextQuery = { ...router.query };
    if (next === 'grid') delete nextQuery.view;
    else nextQuery.view = next;
    router.replace(
      { pathname: '/search', query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  };

  useEffect(() => {
    const value = inputValue.trim();
    if (value === (query || '')) return undefined;
    const timer = setTimeout(() => {
      router.replace(
        {
          pathname: '/search',
          query: value ? { q: value, page: 1 } : {},
        },
        undefined,
        { scroll: false },
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const items = Array.isArray(results?.data) ? results.data : [];
  const total = pagination?.items?.total || items.length;
  const lastPage = pagination?.last_visible_page || 1;

  const safeGenres = Array.isArray(activeGenres) ? activeGenres : [];
  const buildResultsLink = (nextPage) => ({
    pathname: '/search',
    query: {
      ...(query ? { q: query } : {}),
      ...(safeGenres.length > 0
        ? { genres: safeGenres.map((g) => g.mal_id).join(',') }
        : {}),
      ...(activeMood ? { mood: activeMood.id } : {}),
      ...(sort && sort !== 'top' ? { sort } : {}),
      ...(viewMode && viewMode !== 'grid' ? { view: viewMode } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(decade ? { decade } : {}),
      ...(minScore ? { min: minScore } : {}),
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
      mobileTitle={t('nav.discover')}
    >
      {isSearchMode && (kind === 'anime' || activeMood || safeGenres.length > 0) ? (
        <MobileCatalogue
          items={items}
          total={total}
          query={query}
          activeGenres={safeGenres}
          genres={genres}
          type={type}
        />
      ) : (
        <MobileSearch
          inputValue={inputValue}
          setInputValue={setInputValue}
          query={query}
        />
      )}
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <div className={styles.eyebrow}>
              {t('discoverPage.eyebrow')}
            </div>
            {isSearchMode && query ? (
              <h1 className={styles.heading}>
                {t('search.resultsFor')}{' '}
                <span className={styles.highlight}>&ldquo;{query}&rdquo;</span>
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

          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder={t('discoverPage.searchPlaceholder')}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              aria-label={t('discoverPage.searchLabel')}
            />
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </div>
        </header>

        {query ? (
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
            {safeGenres.map((g) => (
              <span key={g.mal_id} className={styles.chip}>
                {g.name}
                <button
                  type="button"
                  className={styles.chipClear}
                  onClick={() => clearOne('genres')}
                  aria-label={t('actions.clear')}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button type="button" className={styles.clearAll} onClick={clearAll}>
              {t('discoverPage.clearAll')}
            </button>
          </div>
        ) : null}

        {isSearchMode ? (
          items.length === 0 ? (
            <div className={styles.empty}>
              <h2>{t('search.emptyTitle')}</h2>
              <p>{t('search.emptyBody')}</p>
            </div>
          ) : (
            <>
              {activeMood || safeGenres.length > 0 ? (
                <div className={styles.filterBannerWrap}>
                  <FilterBanner
                    activeMood={activeMood}
                    activeGenres={safeGenres}
                    count={total}
                    sort={sort}
                    view={viewMode}
                    onViewChange={handleViewChange}
                    type={type}
                    status={status}
                    decade={decade}
                    minScore={minScore}
                    genres={genres}
                    accent={activeMood?.accent}
                  />
                </div>
              ) : (
                <div className={styles.resultsInfo}>
                  <span className={styles.eyebrowInline}>
                    {t('search.titlesOnPage', { n: items.length })}
                  </span>
                  <span className={styles.pageInfo}>
                    {t('search.foundBody', { n: total })} ·{' '}
                    {t('search.pageOf', { current: page, total: lastPage })}
                  </span>
                </div>
              )}
              {viewMode === 'grid' ? (
                <div className={styles.gridResults}>
                  {items.map((element) => (
                    <PosterCard
                      key={element.mal_id}
                      anime={element}
                      width="100%"
                      href={`/anime/${element.mal_id}`}
                      inList={Boolean(entryFor(element.mal_id))}
                    />
                  ))}
                </div>
              ) : (
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
              )}
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
          <>
            {editorial?.primary ? (
              <section className={styles.sectionTight}>
                <EditorialFeature
                  primary={editorial.primary}
                  secondary={editorial.secondary || []}
                />
              </section>
            ) : null}

            {schedulesByDay ? (
              <section className={styles.section}>
                <AiringThisWeek schedulesByDay={schedulesByDay} />
              </section>
            ) : null}

            {editorial?.moodPosters ? (
              <section className={styles.section}>
                <MoodGrid postersByMood={editorial.moodPosters} />
              </section>
            ) : null}

            {genres?.length ? (
              <section className={styles.section}>
                <GenreRail genres={genres} />
              </section>
            ) : null}

            {editorial?.vibePool?.length ? (
              <section className={styles.section}>
                <VibeFinder pool={editorial.vibePool} />
              </section>
            ) : null}

            {editorial?.vibePool?.length ? (
              <section className={styles.section}>
                <BecauseYouLiked pool={editorial.vibePool} />
              </section>
            ) : null}

            {editorial?.gems?.length ? (
              <section className={styles.section}>
                <HiddenGems gems={editorial.gems} />
              </section>
            ) : null}

            {editorial?.vibePool?.length ? (
              <section className={styles.section}>
                <SurpriseMe pool={editorial.vibePool} />
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
  const genresRaw = context.query?.genres ?? context.query?.genre ?? '';
  const genreIds = String(genresRaw)
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter(Number.isFinite);
  const moodId = typeof context.query?.mood === 'string' ? context.query.mood : null;
  const sort = normalizeSort(context.query?.sort);
  const view = normalizeView(context.query?.view);
  const type = normalizeType(context.query?.type);
  const status = normalizeStatus(context.query?.status);
  const decade = normalizeDecade(context.query?.decade);
  const minScore = normalizeScore(context.query?.min);
  const kind = context.query?.kind === 'anime' ? 'anime' : '';

  const genresRes = await getAnimeGenres();
  const genres = (Array.isArray(genresRes?.data) ? genresRes.data : []).map((g) => ({
    mal_id: g.mal_id,
    name: g.name,
    count: g.count || 0,
  }));
  const activeGenres = genreIds
    .map((id) => genres.find((g) => g.mal_id === id))
    .filter(Boolean);
  const activeMood = moodId ? findMood(moodId) : null;

  const isResultsMode = Boolean(query || activeGenres.length > 0 || activeMood);
  if (isResultsMode) {
    let response;
    if (query) {
      try {
        response = await searchAnime(query, page, 21);
      } catch {
        response = { data: [], pagination: {} };
      }
    } else {
      const baseParams = activeMood
        ? overrideSort(activeMood.query, sort)
        : buildGenreQuery(activeGenres.map((g) => g.mal_id).join(','), sort);
      const params = applyExtraFilters(baseParams, {
        type,
        status,
        decade,
        minScore,
        sort,
        today: new Date().toISOString().slice(0, 10),
      });
      response = await getAnimeByFilter({ params, page });
    }
    const filtered = Array.isArray(response?.data)
      ? dedupeByMalId(filterOutHentai(filterUnreleased(response.data)))
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
        activeGenres,
        activeMood: activeMood
          ? {
              id: activeMood.id,
              labelKey: activeMood.labelKey,
              subKey: activeMood.subKey,
              accent: activeMood.accent,
            }
          : null,
        editorial: null,
        genres,
        schedulesByDay: null,
        sort,
        view,
        type,
        status,
        decade,
        minScore,
        kind,
      },
    };
  }

  const topRes = await getTopAnime('', 1);
  const topList = Array.isArray(topRes?.data) ? filterOutHentai(topRes.data) : [];
  const editorial = buildDiscoverPayload(topList);

  if (editorial.moodPosters) {
    const sparse = DISCOVER_MOODS.filter(
      (m) => (editorial.moodPosters[m.id] || []).length < 6,
    );
    if (sparse.length > 0) {
      const fills = await Promise.all(
        sparse.map((m) => getAnimeByFilter({ params: m.query, page: 1 })),
      );
      sparse.forEach((mood, i) => {
        const data = Array.isArray(fills[i]?.data) ? fills[i].data : [];
        const cleaned = filterOutHentai(data).slice(0, 6).map(slimAnimeForDiscover);
        if (cleaned.length > 0) editorial.moodPosters[mood.id] = cleaned;
      });
    }
  }

  const moodPosterIds = editorial.moodPosters
    ? Object.values(editorial.moodPosters).flat().map((a) => a?.mal_id)
    : [];
  const heroIds = [
    editorial.primary?.mal_id,
    ...(editorial.secondary || []).map((a) => a?.mal_id),
    ...(editorial.gems || []).map((a) => a?.mal_id),
    ...(editorial.vibePool || []).map((a) => a?.mal_id),
    ...moodPosterIds,
  ].filter(Boolean);

  if (heroIds.length > 0) {
    const aniListMap = await fetchAniListMediaByMalIds(heroIds);
    const enrich = (entry) => {
      if (!entry?.mal_id) return entry;
      const banner = aniListMap[entry.mal_id]?.bannerImage || null;
      return banner ? { ...entry, banner } : entry;
    };
    if (editorial.primary) editorial.primary = enrich(editorial.primary);
    if (Array.isArray(editorial.secondary)) {
      editorial.secondary = editorial.secondary.map(enrich);
    }
    if (Array.isArray(editorial.gems)) {
      editorial.gems = editorial.gems.map(enrich);
    }
    if (Array.isArray(editorial.vibePool)) {
      editorial.vibePool = editorial.vibePool.map(enrich);
    }
    if (editorial.moodPosters) {
      for (const k of Object.keys(editorial.moodPosters)) {
        editorial.moodPosters[k] = editorial.moodPosters[k].map(enrich);
      }
    }
  }

  let schedulesByDay = null;
  try {
    const scheduleEntries = await Promise.all(
      WEEKDAY_KEYS.map((key) => getSchedules(key).then((res) => [key, res])),
    );
    schedulesByDay = Object.fromEntries(
      scheduleEntries.map(([key, res]) => [
        key,
        Array.isArray(res?.data)
          ? dedupeByMalId(filterOutHentai(res.data)).map(slimScheduleAnime)
          : [],
      ]),
    );
  } catch {
    schedulesByDay = null;
  }

  return {
    props: {
      mode: 'discover',
      query: '',
      page: 1,
      results: { data: [] },
      pagination: {},
      activeGenres: [],
      activeMood: null,
      editorial,
      genres,
      schedulesByDay,
      sort,
      view,
      type: '',
      status: '',
      decade: '',
      minScore: '',
      kind: '',
    },
  };
}

const slimScheduleAnime = (item) => ({
  mal_id: item?.mal_id ?? null,
  title: item?.title ?? null,
  images: {
    webp: {
      image_url: item?.images?.webp?.image_url ?? null,
      large_image_url: item?.images?.webp?.large_image_url ?? null,
    },
    jpg: {
      image_url: item?.images?.jpg?.image_url ?? null,
      large_image_url: item?.images?.jpg?.large_image_url ?? null,
    },
  },
  broadcast: item?.broadcast?.time ? { time: item.broadcast.time } : null,
});
