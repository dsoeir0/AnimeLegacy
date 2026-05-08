import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Dropdown from '../../components/ui/Dropdown';
import PosterCard from '../../components/cards/PosterCard';
import EditorPickCard from '../../components/seasons/EditorPickCard';
import KpiRow from '../../components/seasons/KpiRow';
import SeasonTabs from '../../components/seasons/SeasonTabs';
import TopThreeSection from '../../components/seasons/TopThreeSection';
import styles from './[year].module.css';
import useMyList from '../../hooks/useMyList';
import { dedupeByMalId, filterOutHentai } from '../../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../../lib/services/anilist';
import { getSeasonByYearAll } from '../../lib/services/jikan';
import { computePeriodKpi, getSeasonFromDate, SEASON_KEYS } from '../../lib/utils/season';
import {
  hasScoreSignal,
  isSparseHero,
  pickEditor,
  pickTopThree,
} from '../../lib/utils/seasonHero';

const SORT_OPTIONS = [
  { id: 'popularity', labelKey: 'seasonsPage.sort.popularity' },
  { id: 'rating', labelKey: 'seasonsPage.sort.rating' },
  { id: 'recent', labelKey: 'seasonsPage.sort.recent' },
];

const VOLUME_BASE_YEAR = 2019;

const isValidSeasonScope = (k) => k === 'all' || SEASON_KEYS.includes(k);
const isValidSort = (k) => SORT_OPTIONS.some((o) => o.id === k);

function Seasons({
  winterResposta,
  springResposta,
  summerResposta,
  fallResposta,
  aniListMap,
  year,
  initialQuery,
  t,
}) {
  const router = useRouter();
  const { isInList } = useMyList();

  const seasonMap = useMemo(() => {
    const safeData = (r) => (Array.isArray(r?.data) ? r.data : []);
    return {
      winter: safeData(winterResposta),
      spring: safeData(springResposta),
      summer: safeData(summerResposta),
      fall: safeData(fallResposta),
    };
  }, [winterResposta, springResposta, summerResposta, fallResposta]);

  const numericYear = Number(year);
  const initialSeason = SEASON_KEYS.includes(getSeasonFromDate())
    ? getSeasonFromDate()
    : 'spring';

  const initialScope = isValidSeasonScope(initialQuery?.s) ? initialQuery.s : initialSeason;
  const [activeSeason, setActiveSeason] = useState(
    initialScope === 'all' ? initialSeason : initialScope,
  );
  const [gridScope, setGridScope] = useState(initialScope);
  const [genre, setGenre] = useState(initialQuery?.genre || 'all');
  const [format, setFormat] = useState(initialQuery?.format || 'all');
  const [sort, setSort] = useState(
    isValidSort(initialQuery?.sort) ? initialQuery.sort : 'popularity',
  );
  const [view, setView] = useState(initialQuery?.view === 'list' ? 'list' : 'grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  const seasonItems = useMemo(
    () => seasonMap[activeSeason] || [],
    [activeSeason, seasonMap],
  );

  const gridItems = useMemo(() => {
    if (gridScope === 'all') {
      return dedupeByMalId([
        ...(seasonMap.winter || []),
        ...(seasonMap.spring || []),
        ...(seasonMap.summer || []),
        ...(seasonMap.fall || []),
      ]);
    }
    return seasonMap[gridScope] || [];
  }, [gridScope, seasonMap]);

  const totalAcrossYear = useMemo(
    () =>
      dedupeByMalId([
        ...(seasonMap.winter || []),
        ...(seasonMap.spring || []),
        ...(seasonMap.summer || []),
        ...(seasonMap.fall || []),
      ]).length,
    [seasonMap],
  );

  const stats = useMemo(() => {
    const source = gridScope === 'all' ? gridItems : seasonItems;
    const total = source.length;
    const airing = source.filter((i) =>
      String(i?.status || '').toLowerCase().includes('currently airing'),
    ).length;
    const premieres = source.filter((i) => Number(i?.year) === numericYear).length;
    const periodKpi = computePeriodKpi(gridScope, activeSeason, numericYear);
    return { total, airing, premieres, periodKpi };
  }, [seasonItems, gridItems, gridScope, numericYear, activeSeason]);

  const allGenres = useMemo(() => {
    const s = new Set();
    gridItems.forEach((i) => i?.genres?.forEach((g) => g?.name && s.add(g.name)));
    return Array.from(s).sort();
  }, [gridItems]);

  const allFormats = useMemo(() => {
    const s = new Set();
    gridItems.forEach((i) => i?.type && s.add(i.type));
    return Array.from(s).sort();
  }, [gridItems]);

  const filteredItems = useMemo(() => {
    return gridItems.filter((item) => {
      if (genre !== 'all' && !item?.genres?.some((g) => g?.name === genre)) return false;
      if (format !== 'all' && item?.type !== format) return false;
      return true;
    });
  }, [gridItems, genre, format]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    if (sort === 'rating') {
      arr.sort((a, b) => (b?.score || 0) - (a?.score || 0));
    } else if (sort === 'recent') {
      arr.sort((a, b) => {
        const aDate = new Date(a?.aired?.from || 0).getTime();
        const bDate = new Date(b?.aired?.from || 0).getTime();
        return bDate - aDate;
      });
    } else {
      arr.sort((a, b) => (a?.popularity || 999999) - (b?.popularity || 999999));
    }
    return arr;
  }, [filteredItems, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const pagedItems = useMemo(
    () => sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedItems, currentPage],
  );

  const heroItems = gridScope === 'all' ? gridItems : seasonItems;
  const editorPick = useMemo(() => pickEditor(heroItems), [heroItems]);
  const topThree = useMemo(
    () => pickTopThree(heroItems, editorPick?.mal_id),
    [heroItems, editorPick],
  );
  const heroHasScores = hasScoreSignal(heroItems);
  const sparse = isSparseHero(heroItems);
  const editorPickScore = Number(editorPick?.score) > 0 ? Number(editorPick.score) : null;
  const editorPickStudio = editorPick?.studios?.[0]?.name || null;

  useEffect(() => {
    setCurrentPage(1);
  }, [gridScope, genre, format, sort]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const next = { year: String(numericYear) };
    if (gridScope !== initialSeason) next.s = gridScope;
    if (sort !== 'popularity') next.sort = sort;
    if (genre !== 'all') next.genre = genre;
    if (format !== 'all') next.format = format;
    if (view !== 'grid') next.view = view;
    router.replace({ pathname: router.pathname, query: next }, undefined, {
      shallow: true,
    });
  }, [gridScope, sort, genre, format, view]);

  const resetFilters = () => {
    setGenre('all');
    setFormat('all');
    setSort('popularity');
    setCurrentPage(1);
  };

  const goToYear = (y) => {
    if (Number.isFinite(y) && y >= 1990 && y <= new Date().getFullYear() + 2) {
      router.push(`/seasons/${y}`);
    }
  };

  const volumeNumber = String(Math.max(1, numericYear - VOLUME_BASE_YEAR + 1)).padStart(2, '0');
  const seasonName = gridScope === 'all'
    ? t('seasonsPage.fullYear')
    : t(`seasonsPage.seasons.${activeSeason}`);
  const editorialKey = gridScope === 'all' ? 'all' : activeSeason;

  const genreOptions = useMemo(
    () => [
      { value: 'all', label: t('seasonsPage.all') },
      ...allGenres.map((g) => ({ value: g, label: g })),
    ],
    [allGenres, t],
  );
  const formatOptions = useMemo(
    () => [
      { value: 'all', label: t('seasonsPage.all') },
      ...allFormats.map((f) => ({ value: f, label: f })),
    ],
    [allFormats, t],
  );
  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.id, label: t(o.labelKey) })),
    [t],
  );

  return (
    <Layout
      title={t('seasonsPage.metaTitle', { year })}
      description={t('seasonsPage.metaDesc')}
    >
      <div className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>
              {t('seasonsPage.eyebrow')} · {t('seasonsPage.volume', { n: volumeNumber })}
            </div>
            <h1 className={styles.title}>
              {seasonName}{' '}
              <span className={styles.titleAccent}>{year}</span>
            </h1>
            <KpiRow stats={stats} />
            <p className={styles.subtitle}>
              {t(`seasonsPage.editorial.${editorialKey}`)}
            </p>
            <div className={styles.heroActions}>
              <Button
                variant="secondary"
                size="md"
                icon={SlidersHorizontal}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {t('seasonsPage.filtersToggle')}
              </Button>
            </div>
          </div>

          <EditorPickCard
            pick={editorPick}
            media={editorPick ? aniListMap?.[editorPick.mal_id] : null}
            studio={editorPickStudio}
            score={editorPickScore}
            showRanking={heroHasScores && !sparse}
          />
        </header>

        <div className={styles.tabRow}>
          <SeasonTabs
            seasonMap={seasonMap}
            gridScope={gridScope}
            totalAcrossYear={totalAcrossYear}
            onSelectSeason={(key) => {
              setActiveSeason(key);
              setGridScope(key);
            }}
            onSelectAll={() => setGridScope('all')}
          />
          <div className={styles.tabRowControls}>
            <div className={styles.yearStepper}>
              <IconButton
                icon={ChevronLeft}
                tooltip={t('actions.previousPage')}
                onClick={() => goToYear(numericYear - 1)}
              />
              <span className={styles.yearStepperValue}>{year}</span>
              <IconButton
                icon={ChevronRight}
                tooltip={t('actions.nextPage')}
                onClick={() => goToYear(numericYear + 1)}
              />
            </div>
            <Dropdown
              label={t('seasonsPage.filters.sort')}
              value={sort}
              options={sortOptions}
              onChange={setSort}
            />
          </div>
        </div>

        {filtersOpen ? (
          <div className={styles.filterPanel}>
            <Dropdown
              label={t('seasonsPage.filters.genre')}
              value={genre}
              options={genreOptions}
              onChange={setGenre}
            />
            <Dropdown
              label={t('seasonsPage.filters.format')}
              value={format}
              options={formatOptions}
              onChange={setFormat}
            />
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t('actions.reset')}
            </Button>
          </div>
        ) : null}

        {!sparse ? (
          <TopThreeSection items={topThree} aniListMap={aniListMap} />
        ) : null}

        <section className={styles.allTitles}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionEyebrow}>
                {t('seasonsPage.allTitles.eyebrow')}
              </div>
              <h2 className={styles.sectionTitle}>
                {t('seasonsPage.allTitles.title')}{' '}
                <span className={styles.allTitlesCount}>· {sortedItems.length}</span>
              </h2>
            </div>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
                aria-label={t('actions.gridView')}
                onClick={() => setView('grid')}
              >
                <LayoutGrid size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                aria-label={t('actions.listView')}
                onClick={() => setView('list')}
              >
                <List size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {sortedItems.length === 0 ? (
            <div className={styles.empty}>
              <h3>{t('seasonsPage.emptyTitle')}</h3>
              <p>{t('seasonsPage.emptyBody')}</p>
            </div>
          ) : (
            <div className={view === 'grid' ? styles.grid : styles.listView}>
              {pagedItems.map((item) => (
                <PosterCard
                  key={item.mal_id}
                  anime={item}
                  media={aniListMap?.[item.mal_id]}
                  inList={isInList(item.mal_id)}
                  href={`/anime/${item.mal_id}`}
                  width="100%"
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className={styles.pagination}>
              <IconButton
                icon={ChevronLeft}
                tooltip={t('actions.previousPage')}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
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
                tooltip={t('actions.nextPage')}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          ) : null}
        </section>
      </div>
    </Layout>
  );
}

export default translate(Seasons);

export async function getServerSideProps(context) {
  const { year, s, sort, genre, format, view } = context.query;
  const [winterResposta, springResposta, summerResposta, fallResposta] = await Promise.all([
    getSeasonByYearAll(year, 'winter'),
    getSeasonByYearAll(year, 'spring'),
    getSeasonByYearAll(year, 'summer'),
    getSeasonByYearAll(year, 'fall'),
  ]);
  if (Array.isArray(winterResposta?.data)) winterResposta.data = dedupeByMalId(filterOutHentai(winterResposta.data));
  if (Array.isArray(springResposta?.data)) springResposta.data = dedupeByMalId(filterOutHentai(springResposta.data));
  if (Array.isArray(summerResposta?.data)) summerResposta.data = dedupeByMalId(filterOutHentai(summerResposta.data));
  if (Array.isArray(fallResposta?.data)) fallResposta.data = dedupeByMalId(filterOutHentai(fallResposta.data));
  const ids = [
    ...(winterResposta?.data || []).map((i) => i.mal_id),
    ...(springResposta?.data || []).map((i) => i.mal_id),
    ...(summerResposta?.data || []).map((i) => i.mal_id),
    ...(fallResposta?.data || []).map((i) => i.mal_id),
  ].filter(Boolean);
  const aniListMap = await fetchAniListMediaByMalIds(ids);
  const initialQuery = {
    s: typeof s === 'string' ? s : null,
    sort: typeof sort === 'string' ? sort : null,
    genre: typeof genre === 'string' ? genre : null,
    format: typeof format === 'string' ? format : null,
    view: typeof view === 'string' ? view : null,
  };
  return {
    props: {
      winterResposta,
      springResposta,
      summerResposta,
      fallResposta,
      aniListMap,
      year,
      initialQuery,
    },
  };
}
