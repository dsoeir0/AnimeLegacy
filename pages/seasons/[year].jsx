import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import styles from '../../styles/year.module.css';
import useMyList from '../../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../../lib/services/anilist';
import { getSeasonByYear } from '../../lib/services/jikan';
import { getAnimeImageUrl } from '../../lib/utils/media';

export default function Seasons({
  winterResposta,
  springResposta,
  summerResposta,
  fallResposta,
  aniListMap,
  year,
}) {
  const router = useRouter();
  const safeData = (resp) => (Array.isArray(resp?.data) ? resp.data : []);
  const seasonSets = [
    { key: 'winter', label: 'Winter', data: safeData(winterResposta) },
    { key: 'spring', label: 'Spring', data: safeData(springResposta) },
    { key: 'summer', label: 'Summer', data: safeData(summerResposta) },
    { key: 'fall', label: 'Fall', data: safeData(fallResposta) },
  ];
  const { addItem, removeItem, isInList, canEdit } = useMyList();
  const [filters, setFilters] = useState({
    genre: 'All Genres',
    format: 'All Formats',
    season: 'All Seasons',
    sort: 'Popularity',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 21;
  const [openDropdown, setOpenDropdown] = useState(null);
  const currentYear = new Date().getFullYear();

  const displaySeason = filters.season !== 'All Seasons' ? filters.season : 'All Seasons';

  const filterOptions = useMemo(() => {
    const allItems = seasonSets.flatMap((season) => season.data);
    const genres = new Set();
    const formats = new Set();
    const statuses = new Set();
    allItems.forEach((item) => {
      item?.genres?.forEach((genre) => {
        if (genre?.name) genres.add(genre.name);
      });
      if (item?.type) formats.add(item.type);
      if (item?.status) statuses.add(item.status);
    });
    return {
      genres: ['All Genres', ...Array.from(genres).sort()],
      formats: ['All Formats', ...Array.from(formats).sort()],
    };
  }, [seasonSets]);

  const sortedSeasonSets = useMemo(() => {
    const matchesFilters = (item, seasonKey) => {
      if (filters.season !== 'All Seasons' && seasonKey !== filters.season.toLowerCase())
        return false;
      if (filters.genre !== 'All Genres') {
        const genreMatch = item?.genres?.some((genre) => genre?.name === filters.genre);
        if (!genreMatch) return false;
      }
      if (filters.format !== 'All Formats' && item?.type !== filters.format) return false;
      return true;
    };

    const sortItems = (items) => {
      const sorted = [...items];
      if (filters.sort === 'Rating') {
        sorted.sort((a, b) => (b?.score || 0) - (a?.score || 0));
      } else if (filters.sort === 'Recently Added') {
        sorted.sort((a, b) => {
          const aDate = new Date(a?.aired?.from || 0).getTime();
          const bDate = new Date(b?.aired?.from || 0).getTime();
          return bDate - aDate;
        });
      } else {
        sorted.sort((a, b) => (a?.popularity || 999999) - (b?.popularity || 999999));
      }
      return sorted;
    };

    return seasonSets
      .map((season) => ({
        ...season,
        data: sortItems(season.data.filter((item) => matchesFilters(item, season.key))),
      }))
      .filter((season) => season.data.length > 0);
  }, [filters, seasonSets]);

  const displayedItems = useMemo(() => {
    const allItems =
      filters.season === 'All Seasons'
        ? sortedSeasonSets.flatMap((season) => season.data)
        : sortedSeasonSets[0]?.data || [];
    const unique = [];
    const seen = new Set();
    allItems.forEach((item) => {
      if (!item?.mal_id) return;
      if (seen.has(item.mal_id)) return;
      seen.add(item.mal_id);
      unique.push(item);
    });
    return unique;
  }, [filters.season, sortedSeasonSets]);

  const totalPages = Math.max(1, Math.ceil(displayedItems.length / pageSize));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedItems.slice(start, start + pageSize);
  }, [currentPage, displayedItems]);

  const getBadge = (item, index) => {
    if (index < 2) return 'Popular';
    if ((item?.score || 0) >= 8.5) return 'Hot';
    return null;
  };

  const handleReset = () => {
    setFilters({
      genre: 'All Genres',
      format: 'All Formats',
      season: 'All Seasons',
      sort: 'Popularity',
    });
    setCurrentPage(1);
    if (String(year) !== String(currentYear)) {
      router.push(`/seasons/${currentYear}`);
    }
  };

  const yearOptions = useMemo(() => {
    const current = Number(year);
    if (!Number.isFinite(current)) return [year];
    const maxYear = new Date().getFullYear();
    const oldestYear = 1963;
    const startYear = maxYear;
    const years = [];
    for (let y = startYear; y >= oldestYear; y -= 1) {
      years.push(y);
    }
    return years.length ? years : [current];
  }, [year]);

  const handleYearSelect = (nextYear) => {
    if (nextYear && nextYear !== String(year)) {
      router.push(`/seasons/${nextYear}`);
    }
    setOpenDropdown(null);
  };

  useEffect(() => {
    const handleOutside = (event) => {
      if (!event.target.closest('[data-dropdown-root="true"]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const setFilterValue = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - Seasonal Library"
      description="Explore every season's anime lineup by year, curated for easy discovery."
    >
      <main className={styles.main}>
        <section className={styles.heroPanel}>
          <div className={styles.hero}>
            <div>
              <h1 className={styles.title}>
                Seasonal Anime{' '}
                <span>
                  {displaySeason} {year}
                </span>
              </h1>
              <p className={styles.subtitle}>
                Explore the latest releases, trending sequels, and hidden gems from the broadcast
                season.
              </p>
            </div>
          </div>

          <div className={styles.filters} aria-label="Filters">
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Genre</span>
              <div className={styles.dropdownRoot} data-dropdown-root="true">
                <button
                  className={styles.dropdownButton}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'genre'}
                  onClick={() => setOpenDropdown((prev) => (prev === 'genre' ? null : 'genre'))}
                >
                  {filters.genre}
                  <span className={styles.dropdownCaret} aria-hidden="true" />
                </button>
                {openDropdown === 'genre' ? (
                  <div className={styles.dropdownMenu} role="listbox">
                    {filterOptions.genres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        className={`${styles.dropdownOption} ${filters.genre === genre ? styles.dropdownOptionActive : ''}`}
                        onClick={() => setFilterValue('genre', genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Format</span>
              <div className={styles.dropdownRoot} data-dropdown-root="true">
                <button
                  className={styles.dropdownButton}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'format'}
                  onClick={() => setOpenDropdown((prev) => (prev === 'format' ? null : 'format'))}
                >
                  {filters.format}
                  <span className={styles.dropdownCaret} aria-hidden="true" />
                </button>
                {openDropdown === 'format' ? (
                  <div className={styles.dropdownMenu} role="listbox">
                    {filterOptions.formats.map((format) => (
                      <button
                        key={format}
                        type="button"
                        className={`${styles.dropdownOption} ${filters.format === format ? styles.dropdownOptionActive : ''}`}
                        onClick={() => setFilterValue('format', format)}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Season</span>
              <div className={styles.dropdownRoot} data-dropdown-root="true">
                <button
                  className={styles.dropdownButton}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'season'}
                  onClick={() => setOpenDropdown((prev) => (prev === 'season' ? null : 'season'))}
                >
                  {filters.season}
                  <span className={styles.dropdownCaret} aria-hidden="true" />
                </button>
                {openDropdown === 'season' ? (
                  <div className={styles.dropdownMenu} role="listbox">
                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${filters.season === 'All Seasons' ? styles.dropdownOptionActive : ''}`}
                      onClick={() => setFilterValue('season', 'All Seasons')}
                    >
                      All Seasons
                    </button>
                    {seasonSets.map((season) => (
                      <button
                        key={season.key}
                        type="button"
                        className={`${styles.dropdownOption} ${filters.season === season.label ? styles.dropdownOptionActive : ''}`}
                        onClick={() => setFilterValue('season', season.label)}
                      >
                        {season.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Year</span>
              <div className={styles.dropdownRoot} data-dropdown-root="true">
                <button
                  className={styles.dropdownButton}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'year'}
                  onClick={() => setOpenDropdown((prev) => (prev === 'year' ? null : 'year'))}
                >
                  {year}
                  <span className={styles.dropdownCaret} aria-hidden="true" />
                </button>
                {openDropdown === 'year' ? (
                  <div className={styles.dropdownMenu} role="listbox">
                    {yearOptions.map((optionYear) => (
                      <button
                        key={optionYear}
                        type="button"
                        className={`${styles.dropdownOption} ${String(optionYear) === String(year) ? styles.dropdownOptionActive : ''}`}
                        onClick={() => handleYearSelect(String(optionYear))}
                      >
                        {optionYear}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sort By</span>
              <div className={styles.dropdownRoot} data-dropdown-root="true">
                <button
                  className={styles.dropdownButton}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'sort'}
                  onClick={() => setOpenDropdown((prev) => (prev === 'sort' ? null : 'sort'))}
                >
                  {filters.sort}
                  <span className={styles.dropdownCaret} aria-hidden="true" />
                </button>
                {openDropdown === 'sort' ? (
                  <div className={styles.dropdownMenu} role="listbox">
                    {['Popularity', 'Rating', 'Recently Added'].map((sort) => (
                      <button
                        key={sort}
                        type="button"
                        className={`${styles.dropdownOption} ${filters.sort === sort ? styles.dropdownOptionActive : ''}`}
                        onClick={() => setFilterValue('sort', sort)}
                      >
                        {sort}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <button className={styles.applyButton} type="button" onClick={handleReset}>
              Clear Filters
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.grid}>
            {pagedItems.map((element, index) => {
              const media = aniListMap?.[element.mal_id];
              const imageUrl = getAnimeImageUrl(element, media);
              const normalized = normalizeAnime(element);
              const badge = getBadge(element, index);
              return (
                <div
                  key={element.mal_id}
                  className={styles.card}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                    <a className={styles.cardLink}>
                      <div className={styles.poster}>
                        {badge ? <span className={styles.badge}>{badge}</span> : null}
                        <Image
                          className={styles.posterImage}
                          src={imageUrl || '/logo_no_text.png'}
                          alt={element.title}
                          fill
                          sizes="200px"
                        />
                        <span className={styles.score}>{element.score || 'NR'}</span>
                      </div>
                      <div className={styles.cardTitle}>{element.title}</div>
                      <div className={styles.cardMeta}>
                        <span>{element.type || 'TV'}</span>
                        <span>{element.episodes ? `${element.episodes} episodes` : 'TBA'}</span>
                      </div>
                    </a>
                  </Link>
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => {
                      if (!normalized) return;
                      if (!canEdit) return;
                      if (isInList(normalized.id)) {
                        removeItem(normalized.id);
                      } else {
                        addItem(normalized);
                      }
                    }}
                    disabled={!canEdit}
                  >
                    {!canEdit
                      ? 'Login to Add'
                      : normalized && isInList(normalized.id)
                        ? 'In My List'
                        : 'Add to List'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.pagination} aria-label="Pagination">
          <button
            className={styles.pageButton}
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            &lsaquo;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(0, 5)
            .map((page) => (
              <button
                key={page}
                className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
                type="button"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          {totalPages > 5 ? <span className={styles.pageEllipsis}>…</span> : null}
          {totalPages > 5 ? (
            <button
              className={`${styles.pageButton} ${currentPage === totalPages ? styles.pageButtonActive : ''}`}
              type="button"
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </button>
          ) : null}
          <button
            className={styles.pageButton}
            type="button"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            &rsaquo;
          </button>
        </section>
      </main>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { year } = context.query;

  const [winterResposta, springResposta, summerResposta] = await Promise.all([
    getSeasonByYear(year, 'winter'),
    getSeasonByYear(year, 'spring'),
    getSeasonByYear(year, 'summer'),
  ]);

  await new Promise((res) => setTimeout(res, 1000));
  const fallResposta = await getSeasonByYear(year, 'fall');

  if (Array.isArray(winterResposta?.data))
    winterResposta.data = filterOutHentai(winterResposta.data);
  if (Array.isArray(springResposta?.data))
    springResposta.data = filterOutHentai(springResposta.data);
  if (Array.isArray(summerResposta?.data))
    summerResposta.data = filterOutHentai(summerResposta.data);
  if (Array.isArray(fallResposta?.data)) fallResposta.data = filterOutHentai(fallResposta.data);

  const ids = [
    ...(winterResposta?.data || []).map((item) => item.mal_id),
    ...(springResposta?.data || []).map((item) => item.mal_id),
    ...(summerResposta?.data || []).map((item) => item.mal_id),
    ...(fallResposta?.data || []).map((item) => item.mal_id),
  ].filter(Boolean);
  const aniListMap = await fetchAniListMediaByMalIds(ids);

  return {
    props: { winterResposta, springResposta, summerResposta, fallResposta, aniListMap, year },
  };
}
