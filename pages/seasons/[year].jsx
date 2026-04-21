import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import PosterCard from '../../components/cards/PosterCard';
import styles from './[year].module.css';
import useMyList from '../../hooks/useMyList';
import { filterOutHentai } from '../../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../../lib/services/anilist';
import { getSeasonByYear } from '../../lib/services/jikan';

const SEASONS = [
  { key: 'winter', label: 'Winter' },
  { key: 'spring', label: 'Spring' },
  { key: 'summer', label: 'Summer' },
  { key: 'fall', label: 'Fall' },
];

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'rating', label: 'Rating' },
  { id: 'recent', label: 'Recently added' },
];

export default function Seasons({
  winterResposta,
  springResposta,
  summerResposta,
  fallResposta,
  aniListMap,
  year,
}) {
  const router = useRouter();
  const { isInList } = useMyList();
  const safeData = (r) => (Array.isArray(r?.data) ? r.data : []);

  const seasonMap = {
    winter: safeData(winterResposta),
    spring: safeData(springResposta),
    summer: safeData(summerResposta),
    fall: safeData(fallResposta),
  };

  const [activeSeason, setActiveSeason] = useState('all');
  const [genre, setGenre] = useState('all');
  const [format, setFormat] = useState('all');
  const [sort, setSort] = useState('popularity');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  const allItems = useMemo(() => {
    return [...seasonMap.winter, ...seasonMap.spring, ...seasonMap.summer, ...seasonMap.fall];
  }, [seasonMap]);

  const genres = useMemo(() => {
    const set = new Set();
    allItems.forEach((item) => item?.genres?.forEach((g) => g?.name && set.add(g.name)));
    return ['all', ...Array.from(set).sort()];
  }, [allItems]);

  const formats = useMemo(() => {
    const set = new Set();
    allItems.forEach((item) => item?.type && set.add(item.type));
    return ['all', ...Array.from(set).sort()];
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const pool = activeSeason === 'all' ? allItems : seasonMap[activeSeason] || [];
    const seen = new Set();
    const unique = [];
    pool.forEach((item) => {
      if (!item?.mal_id || seen.has(item.mal_id)) return;
      seen.add(item.mal_id);
      unique.push(item);
    });
    return unique.filter((item) => {
      if (genre !== 'all') {
        if (!item?.genres?.some((g) => g?.name === genre)) return false;
      }
      if (format !== 'all' && item?.type !== format) return false;
      return true;
    });
  }, [activeSeason, allItems, seasonMap, genre, format]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    if (sort === 'rating') {
      list.sort((a, b) => (b?.score || 0) - (a?.score || 0));
    } else if (sort === 'recent') {
      list.sort((a, b) => {
        const aDate = new Date(a?.aired?.from || 0).getTime();
        const bDate = new Date(b?.aired?.from || 0).getTime();
        return bDate - aDate;
      });
    } else {
      list.sort((a, b) => (a?.popularity || 999999) - (b?.popularity || 999999));
    }
    return list;
  }, [filteredItems, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const pagedItems = useMemo(
    () => sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedItems, currentPage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSeason, genre, format, sort]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!event.target.closest('[data-dropdown-root="true"]')) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const yearOptions = useMemo(() => {
    const maxYear = new Date().getFullYear();
    const arr = [];
    for (let y = maxYear; y >= 1990; y -= 1) arr.push(y);
    return arr;
  }, []);

  const handleYearSelect = (y) => {
    setOpenDropdown(null);
    if (String(y) !== String(year)) router.push(`/seasons/${y}`);
  };

  const resetFilters = () => {
    setActiveSeason('all');
    setGenre('all');
    setFormat('all');
    setSort('popularity');
    setCurrentPage(1);
  };

  const renderDropdown = (id, current, options, onSelect, labelFn = (v) => (v === 'all' ? 'All' : v)) => (
    <div className={styles.dropdownRoot} data-dropdown-root="true">
      <button
        className={styles.dropdownBtn}
        type="button"
        onClick={() => setOpenDropdown((p) => (p === id ? null : id))}
        aria-expanded={openDropdown === id}
      >
        {labelFn(current)}
        <ChevronDown size={14} />
      </button>
      {openDropdown === id ? (
        <div className={styles.dropdownMenu}>
          {options.map((opt) => (
            <button
              key={typeof opt === 'string' ? opt : opt.id}
              type="button"
              className={`${styles.dropdownOption} ${
                (typeof opt === 'string' ? opt : opt.id) === current ? styles.dropdownOptionActive : ''
              }`}
              onClick={() => {
                onSelect(typeof opt === 'string' ? opt : opt.id);
                setOpenDropdown(null);
              }}
            >
              {typeof opt === 'string' ? labelFn(opt) : opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Layout
      title={`AnimeLegacy · Seasons ${year}`}
      description="Every season's anime lineup by year, curated for easy discovery."
    >
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <div className={styles.eyebrow}>SEASONAL ARCHIVE</div>
            <h1 className={styles.heading}>
              {year} <span className={styles.headingHighlight}>seasons</span>
            </h1>
            <p className={styles.subtitle}>
              Browse every winter, spring, summer, and fall release with filters for genre, format, and sort.
            </p>
          </div>
          <div className={styles.yearWrap}>
            <span className={styles.filterLabel}>YEAR</span>
            {renderDropdown(
              'year',
              String(year),
              yearOptions.map(String),
              handleYearSelect,
              (v) => v,
            )}
          </div>
        </header>

        <div className={styles.seasonTabs}>
          <button
            type="button"
            className={`${styles.seasonTab} ${activeSeason === 'all' ? styles.seasonTabActive : ''}`}
            onClick={() => setActiveSeason('all')}
          >
            All seasons
          </button>
          {SEASONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.seasonTab} ${activeSeason === s.key ? styles.seasonTabActive : ''}`}
              onClick={() => setActiveSeason(s.key)}
            >
              {s.label}
              <span className={styles.seasonCount}>{seasonMap[s.key]?.length || 0}</span>
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>GENRE</span>
            {renderDropdown('genre', genre, genres, setGenre)}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>FORMAT</span>
            {renderDropdown('format', format, formats, setFormat)}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>SORT</span>
            {renderDropdown(
              'sort',
              sort,
              SORT_OPTIONS,
              setSort,
              (v) => SORT_OPTIONS.find((o) => o.id === v)?.label || v,
            )}
          </div>
          <Button variant="ghost" size="md" onClick={resetFilters}>
            Reset
          </Button>
          <div className={styles.countBadge}>
            {sortedItems.length} titles
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <div className={styles.empty}>
            <h2>No results</h2>
            <p>Try removing a filter or switching seasons.</p>
          </div>
        ) : (
          <div className={styles.grid}>
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
              tooltip="Previous page"
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
              tooltip="Next page"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { year } = context.query;
  const [winterResposta, springResposta, summerResposta, fallResposta] = await Promise.all([
    getSeasonByYear(year, 'winter'),
    getSeasonByYear(year, 'spring'),
    getSeasonByYear(year, 'summer'),
    getSeasonByYear(year, 'fall'),
  ]);
  if (Array.isArray(winterResposta?.data)) winterResposta.data = filterOutHentai(winterResposta.data);
  if (Array.isArray(springResposta?.data)) springResposta.data = filterOutHentai(springResposta.data);
  if (Array.isArray(summerResposta?.data)) summerResposta.data = filterOutHentai(summerResposta.data);
  if (Array.isArray(fallResposta?.data)) fallResposta.data = filterOutHentai(fallResposta.data);
  const ids = [
    ...(winterResposta?.data || []).map((i) => i.mal_id),
    ...(springResposta?.data || []).map((i) => i.mal_id),
    ...(summerResposta?.data || []).map((i) => i.mal_id),
    ...(fallResposta?.data || []).map((i) => i.mal_id),
  ].filter(Boolean);
  const aniListMap = await fetchAniListMediaByMalIds(ids);
  return {
    props: { winterResposta, springResposta, summerResposta, fallResposta, aniListMap, year },
  };
}
