import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Dropdown from '../../components/ui/Dropdown';
import PosterCard from '../../components/cards/PosterCard';
import styles from './[year].module.css';
import useMyList from '../../hooks/useMyList';
import { dedupeByMalId, filterOutHentai } from '../../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../../lib/services/anilist';
import { getSeasonByYearAll } from '../../lib/services/jikan';
import { getSeasonFromDate } from '../../lib/utils/season';
import { getAnimeImageUrl } from '../../lib/utils/media';

const SEASONS = [
  { key: 'winter', labelKey: 'seasonsPage.seasons.winter' },
  { key: 'spring', labelKey: 'seasonsPage.seasons.spring' },
  { key: 'summer', labelKey: 'seasonsPage.seasons.summer' },
  { key: 'fall', labelKey: 'seasonsPage.seasons.fall' },
];

const SORT_OPTIONS = [
  { id: 'popularity', labelKey: 'seasonsPage.sort.popularity' },
  { id: 'rating', labelKey: 'seasonsPage.sort.rating' },
  { id: 'recent', labelKey: 'seasonsPage.sort.recent' },
];

const SEASON_START_DAY = { winter: [0, 1], spring: [3, 1], summer: [6, 1], fall: [9, 1] };
const SEASON_END_DAY = { winter: [2, 31], spring: [5, 30], summer: [8, 30], fall: [11, 31] };

const VOLUME_BASE_YEAR = 2019;

const isValidSeasonKey = (k) => k === 'all' || SEASONS.some((s) => s.key === k);
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
  const currentSeasonKey = getSeasonFromDate();
  const initialSeason = SEASONS.find((s) => s.key === currentSeasonKey)?.key || 'spring';

  const initialScope = isValidSeasonKey(initialQuery?.s) ? initialQuery.s : initialSeason;
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
    const [startMonth, startDay] = gridScope === 'all' ? [0, 1] : SEASON_START_DAY[activeSeason];
    const [endMonth, endDay] = gridScope === 'all' ? [11, 31] : SEASON_END_DAY[activeSeason];
    const periodStart = new Date(numericYear, startMonth, startDay);
    const periodEnd = new Date(numericYear, endMonth, endDay, 23, 59, 59);
    const today = new Date();
    let periodKpi;
    if (today.getTime() > periodEnd.getTime()) {
      periodKpi = { kind: 'ended' };
    } else if (today.getTime() < periodStart.getTime()) {
      const days = Math.max(
        0,
        Math.ceil((periodStart.getTime() - today.getTime()) / 86400000),
      );
      periodKpi = { kind: 'upcoming', days };
    } else {
      const days = Math.max(
        0,
        Math.ceil((periodEnd.getTime() - today.getTime()) / 86400000),
      );
      periodKpi = { kind: 'active', days };
    }
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
  const hasScoreSignal = useMemo(
    () => heroItems.some((i) => Number(i?.score) > 0),
    [heroItems],
  );
  const sortHero = (arr) => {
    if (hasScoreSignal) {
      return arr.sort((a, b) => (Number(b?.score) || 0) - (Number(a?.score) || 0));
    }
    return arr.sort((a, b) => (a?.popularity || 999999) - (b?.popularity || 999999));
  };

  const editorPick = useMemo(() => {
    if (heroItems.length === 0) return null;
    return sortHero([...heroItems])[0];
  }, [heroItems, hasScoreSignal]);

  const topThree = useMemo(() => {
    return sortHero([...heroItems].filter((i) => i?.mal_id !== editorPick?.mal_id)).slice(0, 3);
  }, [heroItems, editorPick, hasScoreSignal]);

  const isSparse = heroItems.length <= 4;
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

  const editorPosterUrl = editorPick
    ? getAnimeImageUrl(editorPick, aniListMap?.[editorPick.mal_id])
    : null;

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
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>{t('seasonsPage.kpis.titles')}</div>
                <div className={styles.kpiValue}>{stats.total}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>{t('seasonsPage.kpis.airing')}</div>
                <div className={styles.kpiValue}>{stats.airing}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>{t('seasonsPage.kpis.premieres')}</div>
                <div className={styles.kpiValue}>{stats.premieres}</div>
              </div>
              {stats.periodKpi.kind === 'ended' ? (
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t('seasonsPage.kpis.status')}</div>
                  <div className={styles.kpiValueText}>
                    {t('seasonsPage.kpis.statusEnded')}
                  </div>
                </div>
              ) : stats.periodKpi.kind === 'upcoming' ? (
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t('seasonsPage.kpis.daysUntilStart')}</div>
                  <div className={styles.kpiValue}>{stats.periodKpi.days}</div>
                </div>
              ) : (
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t('seasonsPage.kpis.daysUntilEnd')}</div>
                  <div className={styles.kpiValue}>{stats.periodKpi.days}</div>
                </div>
              )}
            </div>
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

          {editorPick ? (
            <div className={styles.editorPickWrap}>
              <div className={styles.editorPickHeader}>
                {t('seasonsPage.editorPickHeader')}
              </div>
              <Link
                href={`/anime/${editorPick.mal_id}`}
                className={styles.editorPick}
              >
                {editorPosterUrl ? (
                  <Image
                    src={editorPosterUrl}
                    alt={editorPick.title || ''}
                    fill
                    sizes="(max-width: 1100px) 100vw, 320px"
                    className={styles.editorPickImg}
                  />
                ) : null}
                <div className={styles.editorPickGradient} />
                {hasScoreSignal && !isSparse ? (
                  <div className={styles.editorPickEyebrow}>
                    {t('seasonsPage.editorPickRank')}
                  </div>
                ) : null}
                <div className={styles.editorPickContent}>
                  <div className={styles.editorPickTitle}>{editorPick.title}</div>
                  <div className={styles.editorPickMeta}>
                    {editorPickStudio ? <span>{editorPickStudio}</span> : null}
                    {editorPick.episodes ? (
                      <>
                        {editorPickStudio ? <span>·</span> : null}
                        <span>{editorPick.episodes} ep</span>
                      </>
                    ) : null}
                  </div>
                  {editorPickScore !== null ? (
                    <div className={styles.editorPickScore}>
                      ★ {editorPickScore.toFixed(2)}{' '}
                      <span className={styles.editorPickScoreSuffix}>MAL</span>
                    </div>
                  ) : null}
                </div>
              </Link>
            </div>
          ) : null}
        </header>

        <div className={styles.tabRow}>
          <div className={styles.tabs}>
            {SEASONS.map((s) => {
              const count = seasonMap[s.key]?.length || 0;
              const empty = count === 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={empty}
                  aria-disabled={empty}
                  className={`${styles.tab} ${gridScope === s.key ? styles.tabActive : ''} ${
                    empty ? styles.tabEmpty : ''
                  }`}
                  onClick={() => {
                    if (empty) return;
                    setActiveSeason(s.key);
                    setGridScope(s.key);
                  }}
                >
                  <span className={styles.tabLabel}>
                    {t(s.labelKey)}
                    <span className={styles.tabCount}>{count}</span>
                  </span>
                  <span className={styles.tabRange}>
                    {t(`seasonsPage.tabRanges.${s.key}`)}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              className={`${styles.tab} ${gridScope === 'all' ? styles.tabActive : ''}`}
              onClick={() => setGridScope('all')}
            >
              <span className={styles.tabLabel}>
                {t('seasonsPage.seasons.all')}
                <span className={styles.tabCount}>{totalAcrossYear}</span>
              </span>
              <span className={styles.tabRange}>
                {t('seasonsPage.tabRanges.all')}
              </span>
            </button>
          </div>
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

        {topThree.length > 0 && !isSparse ? (
          <section className={styles.topThree}>
            <div className={styles.sectionHead}>
              <div>
                <div className={styles.sectionEyebrow}>
                  {t('seasonsPage.topThree.eyebrow')}
                </div>
                <h2 className={styles.sectionTitle}>
                  {t('seasonsPage.topThree.title')}
                </h2>
              </div>
            </div>
            <div className={styles.topThreeGrid}>
              {topThree.map((item, idx) => {
                const banner = getAnimeImageUrl(item, aniListMap?.[item.mal_id]);
                const studio = item.studios?.[0]?.name || '—';
                return (
                  <Link
                    key={item.mal_id}
                    href={`/anime/${item.mal_id}`}
                    className={styles.topThreeCard}
                  >
                    <div className={styles.topThreeBanner}>
                      {banner ? (
                        <Image
                          src={banner}
                          alt={item.title || ''}
                          fill
                          sizes="(max-width: 1100px) 100vw, 420px"
                          quality={90}
                          className={styles.topThreeImg}
                        />
                      ) : null}
                      <div className={styles.topThreeGradient} />
                      <div className={styles.topThreeRank}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                    </div>
                    <div className={styles.topThreeBody}>
                      <div className={styles.topThreeMeta}>
                        <span>{studio}</span>
                        {item.year ? (
                          <>
                            <span>·</span>
                            <span>{item.year}</span>
                          </>
                        ) : null}
                      </div>
                      <div className={styles.topThreeTitle}>{item.title}</div>
                      {Number(item?.score) > 0 ? (
                        <div className={styles.topThreeScore}>★ {Number(item.score).toFixed(2)}</div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
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
