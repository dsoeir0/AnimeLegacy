import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { primaryStudioName } from '../../lib/utils/anime';
import { formatFivePoint } from '../../lib/utils/rating';
import styles from './MobileCatalogue.module.css';

const TYPE_TABS = [
  { id: '', labelKey: 'discoverPage.mobileTypeAll' },
  { id: 'tv', labelKey: 'discoverPage.mobileTypeTv' },
  { id: 'movie', labelKey: 'discoverPage.mobileTypeMovie' },
  { id: 'ova', labelKey: 'discoverPage.mobileTypeOva' },
  { id: 'special', labelKey: 'discoverPage.mobileTypeSpecial' },
  { id: 'ona', labelKey: 'discoverPage.mobileTypeOna' },
];

const cleanSynopsis = (text, max = 110) => {
  if (typeof text !== 'string') return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max);
  const cut = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, cut > 60 ? cut : max)}…`;
};

function MobileCatalogue({
  items,
  total,
  query,
  activeGenres,
  genres,
  type,
  t,
}) {
  const router = useRouter();

  const setQueryParam = (key, value) => {
    const next = { ...router.query };
    delete next.page;
    if (value === null || value === undefined || value === '') {
      delete next[key];
    } else {
      next[key] = value;
    }
    router.push({ pathname: '/search', query: next }, undefined, { scroll: false });
  };

  const toggleGenre = (genreId) => {
    const idStr = String(genreId);
    const current = String(router.query?.genres ?? router.query?.genre ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const next = current.includes(idStr)
      ? current.filter((id) => id !== idStr)
      : [...current, idStr];
    setQueryParam('genres', next.length ? next.join(',') : '');
  };

  const featured = items[0];
  const rest = items.slice(1);
  const activeGenreIds = new Set(activeGenres.map((g) => String(g.mal_id)));
  const remainingGenres = (genres || [])
    .filter((g) => !activeGenreIds.has(String(g.mal_id)))
    .slice(0, 14);

  const titleCount = total || items.length;
  const genreCount = (genres || []).length;
  const years = items
    .map((it) => Number.isFinite(it?.year) ? it.year : null)
    .filter(Boolean);
  const yearSpan = years.length > 0 ? Math.max(...years) - Math.min(...years) + 1 : null;

  return (
    <div className={styles.mobileCatalogue}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          {query
            ? t('discoverPage.mobileCatalogueEyebrowQuery', { q: query })
            : t('discoverPage.mobileCatalogueEyebrow')}
        </span>
        <h1 className={styles.title}>{t('discoverPage.mobileCatalogueTitle')}</h1>
        <div className={styles.stats}>
          <span>{t('discoverPage.mobileStatsTitles', { n: titleCount.toLocaleString() })}</span>
          {genreCount > 0 ? (
            <>
              <span className={styles.statsDot} />
              <span>{t('discoverPage.mobileStatsGenres', { n: genreCount })}</span>
            </>
          ) : null}
          {yearSpan ? (
            <>
              <span className={styles.statsDot} />
              <span>{t('discoverPage.mobileStatsYears', { n: yearSpan })}</span>
            </>
          ) : null}
        </div>
      </header>

      <div className={styles.typeTabs} role="tablist">
        {TYPE_TABS.map((tab) => {
          const on = (type || '') === tab.id;
          return (
            <button
              key={tab.id || 'all'}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.typeTab} ${on ? styles.typeTabActive : ''}`}
              onClick={() => setQueryParam('type', tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {(activeGenres.length > 0 || remainingGenres.length > 0) ? (
        <div className={styles.genreRow}>
          {activeGenres.map((g) => (
            <button
              key={`active-${g.mal_id}`}
              type="button"
              className={`${styles.genreChip} ${styles.genreChipActive}`}
              onClick={() => toggleGenre(g.mal_id)}
            >
              {g.name.toUpperCase()}
              <X size={11} strokeWidth={2.5} />
            </button>
          ))}
          {remainingGenres.map((g) => (
            <button
              key={`avail-${g.mal_id}`}
              type="button"
              className={styles.genreChip}
              onClick={() => toggleGenre(g.mal_id)}
            >
              {g.name.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}

      {featured ? (
        <Link href={`/anime/${featured.mal_id}`} className={styles.feature}>
          <span className={styles.featurePoster}>
            {getAnimeImageUrl(featured) ? (
              <Image
                src={getAnimeImageUrl(featured)}
                alt={featured.title || ''}
                fill
                sizes="120px"
              />
            ) : null}
            {featured.type ? (
              <span className={styles.featurePosterMeta}>
                {featured.type.toUpperCase()}
                {featured.episodes ? ` / ${featured.episodes} ${t('seasonsPage.epShort')}` : ''}
              </span>
            ) : null}
          </span>
          <span className={styles.featureBody}>
            <span className={styles.featureEyebrow}>
              {t('discoverPage.mobileBestMatch')}
              {primaryStudioName(featured) ? (
                <>
                  <span className={styles.featureEyebrowDot} />
                  {primaryStudioName(featured).toUpperCase()}
                </>
              ) : null}
            </span>
            <span className={styles.featureTitle}>{featured.title}</span>
            {typeof featured.score === 'number' ? (
              <span className={styles.featureScoreRow}>
                <span className={styles.featureScoreBadge}>
                  {formatFivePoint(featured.score)}
                </span>
                {typeof featured.scored_by === 'number' ? (
                  <span className={styles.featureScoreMeta}>
                    {t('discoverPage.mobileScoredBy', {
                      n: featured.scored_by.toLocaleString(),
                    })}
                  </span>
                ) : null}
              </span>
            ) : null}
            {featured.synopsis ? (
              <span className={styles.featureSynopsis}>
                {cleanSynopsis(featured.synopsis, 110)}
              </span>
            ) : null}
            {Array.isArray(featured.genres) && featured.genres.length > 0 ? (
              <span className={styles.featureGenres}>
                {featured.genres.slice(0, 3).map((g) => (
                  <span key={g.mal_id || g.name} className={styles.featureGenreChip}>
                    {(g.name || '').toUpperCase()}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </Link>
      ) : null}

      {rest.length > 0 ? (
        <section className={styles.allResults}>
          <div className={styles.allResultsHead}>
            <h2 className={styles.allResultsTitle}>
              {t('discoverPage.mobileAllResults')}
            </h2>
            <span className={styles.allResultsCount}>
              {t('discoverPage.mobileShowingOf', {
                shown: items.length,
                total: titleCount.toLocaleString(),
              })}
            </span>
          </div>
          <div className={styles.grid}>
            {rest.map((anime) => {
              const cover = getAnimeImageUrl(anime);
              const score = typeof anime.score === 'number' ? anime.score : null;
              return (
                <Link
                  key={anime.mal_id}
                  href={`/anime/${anime.mal_id}`}
                  className={styles.gridCard}
                >
                  <span className={styles.gridPoster}>
                    {cover ? (
                      <Image
                        src={cover}
                        alt={anime.title || ''}
                        fill
                        sizes="(max-width: 768px) 33vw, 140px"
                      />
                    ) : null}
                    {score !== null ? (
                      <span className={styles.gridScore}>
                        {formatFivePoint(score)}
                      </span>
                    ) : null}
                    <span className={styles.gridGradient} />
                  </span>
                  <span className={styles.gridTitle}>{anime.title}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {items.length === 0 ? (
        <div className={styles.empty}>{t('search.mobileNoResults', { q: query || '—' })}</div>
      ) : null}
    </div>
  );
}

export default translate(MobileCatalogue);
