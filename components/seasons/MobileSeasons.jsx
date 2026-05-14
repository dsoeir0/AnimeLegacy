import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronDown } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { isAiringAnime, primaryStudioName } from '../../lib/utils/anime';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { formatFivePoint } from '../../lib/utils/rating';
import styles from './MobileSeasons.module.css';

const SEASON_KEYS = ['winter', 'spring', 'summer', 'fall'];
const VOLUME_BASE_YEAR = 2019;

function YearDropdown({ year, t }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear + 1; y >= VOLUME_BASE_YEAR; y -= 1) list.push(y);
    return list;
  }, [currentYear]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className={styles.yearRoot} ref={rootRef}>
      <button
        type="button"
        className={styles.headerYear}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.headerYearLabel}>{t('seasonsPage.yearLabel')}</span>
        <span>{year}</span>
        <ChevronDown size={11} strokeWidth={2.5} />
      </button>
      {open ? (
        <ul className={styles.yearMenu} role="listbox">
          {years.map((y) => (
            <li key={y}>
              <button
                type="button"
                role="option"
                aria-selected={y === year}
                className={`${styles.yearOption} ${y === year ? styles.yearOptionActive : ''}`}
                onClick={() => {
                  setOpen(false);
                  router.push(`/seasons/${y}`);
                }}
              >
                {y}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const FeaturedRow = memo(function FeaturedRow({ anime, index, aniListMap, t }) {
  const cover = getAnimeImageUrl(anime, aniListMap?.[anime.mal_id]);
  const studio = primaryStudioName(anime) || '';
  const score = typeof anime.score === 'number' ? anime.score : null;
  return (
    <Link href={`/anime/${anime.mal_id}`} className={styles.featuredRow}>
      <span className={styles.featuredRank}>{String(index).padStart(2, '0')}</span>
      <span className={styles.featuredPoster}>
        {cover ? <Image src={cover} alt="" fill sizes="88px" /> : null}
        {anime.type ? (
          <span className={styles.featuredPosterMeta}>
            {anime.type.toUpperCase()}
            {anime.episodes ? ` / ${anime.episodes} EP` : ''}
          </span>
        ) : null}
      </span>
      <span className={styles.featuredBody}>
        {studio ? <span className={styles.featuredStudio}>{studio.toUpperCase()}</span> : null}
        <span className={styles.featuredTitle}>{anime.title}</span>
        <span className={styles.featuredFoot}>
          {score !== null ? (
            <span className={styles.featuredScore}>{formatFivePoint(score)}</span>
          ) : null}
          {anime.type ? (
            <span className={styles.featuredFootMeta}>
              {anime.type.toUpperCase()}
              {anime.episodes ? ` · ${anime.episodes} ${t('seasonsPage.epShort')}` : ''}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
});

const GridCard = memo(function GridCard({ anime, aniListMap }) {
  const cover = getAnimeImageUrl(anime, aniListMap?.[anime.mal_id]);
  const studio = primaryStudioName(anime) || '';
  return (
    <Link href={`/anime/${anime.mal_id}`} className={styles.gridCard}>
      <span className={styles.gridPoster}>
        {cover ? (
          <Image src={cover} alt="" fill sizes="(max-width: 768px) 45vw, 200px" />
        ) : null}
        {anime.type ? (
          <span className={styles.gridMeta}>
            {anime.type.toUpperCase()}
            {anime.episodes ? ` / ${anime.episodes} EP` : ''}
          </span>
        ) : null}
      </span>
      <span className={styles.gridTitle}>{anime.title}</span>
      <span className={styles.gridSub}>
        {studio ? studio.toUpperCase() : ''}
        {studio && anime.year ? ' · ' : ''}
        {anime.year || ''}
      </span>
    </Link>
  );
});

function MobileSeasons({ seasonMap, year, initialSeason, aniListMap, t }) {
  const [active, setActive] = useState(initialSeason);

  const counts = useMemo(
    () => ({
      winter: (seasonMap.winter || []).length,
      spring: (seasonMap.spring || []).length,
      summer: (seasonMap.summer || []).length,
      fall: (seasonMap.fall || []).length,
    }),
    [seasonMap],
  );

  const activeItems = seasonMap[active] || [];
  const sortedByScore = useMemo(
    () =>
      [...activeItems].sort(
        (a, b) => (b?.score ?? -Infinity) - (a?.score ?? -Infinity),
      ),
    [activeItems],
  );
  const top3 = sortedByScore.slice(0, 3);
  const rest = sortedByScore.slice(3);
  const airingCount = activeItems.filter((item) => isAiringAnime(item)).length;
  const seasonLabel = t(`seasonsPage.seasons.${active}`);

  return (
    <div className={styles.mobileSeasons}>
      <header className={styles.header}>
        <span className={styles.headerGlow} aria-hidden="true" />
        <div className={styles.headerTop}>
          <span className={styles.headerEyebrow}>{t('seasonsPage.archiveEyebrow')}</span>
          <YearDropdown year={year} t={t} />
        </div>
        <h1 className={styles.headerTitle}>
          {seasonLabel}
          <br />
          <span className={styles.headerYearAccent}>{year}</span>
        </h1>
        <div className={styles.headerStats}>
          {t('seasonsPage.mobileStatsTitles', { n: activeItems.length })}
          {airingCount > 0 ? (
            <>
              <span className={styles.headerStatsDot} />
              {t('seasonsPage.mobileStatsAiring', { n: airingCount })}
            </>
          ) : null}
        </div>
        <p className={styles.headerBlurb}>{t(`seasonsPage.blurb.${active}`)}</p>
      </header>

      <div className={styles.tabs}>
        {SEASON_KEYS.map((key) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              className={`${styles.tab} ${on ? styles.tabActive : ''}`}
              onClick={() => setActive(key)}
              aria-pressed={on}
            >
              <span className={styles.tabLabel}>{t(`seasonsPage.seasons.${key}`)}</span>
              <span className={styles.tabCount}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {top3.length > 0 ? (
        <section className={styles.editorial}>
          <div className={styles.editorialHead}>
            <span className={styles.editorialEyebrow}>
              {t('seasonsPage.threeToWatchEyebrow')}
            </span>
            <h2 className={styles.editorialTitle}>{t('seasonsPage.threeToWatchTitle')}</h2>
          </div>
          <div className={styles.editorialList}>
            {top3.map((anime, i) => (
              <FeaturedRow
                key={anime.mal_id}
                anime={anime}
                index={i + 1}
                aniListMap={aniListMap}
                t={t}
              />
            ))}
          </div>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <>
          <div className={styles.allHead}>
            <h2 className={styles.allTitle}>
              {t('seasonsPage.mobileAllTitle', { n: activeItems.length })}
            </h2>
          </div>
          <div className={styles.gridTwoCol}>
            {rest.map((anime) => (
              <GridCard key={anime.mal_id} anime={anime} aniListMap={aniListMap} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default translate(MobileSeasons);
