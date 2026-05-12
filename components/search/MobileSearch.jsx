import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { formatFivePoint } from '../../lib/utils/rating';
import { primaryStudioName } from '../../lib/utils/anime';
import {
  EMPTY_CATEGORY_RESULTS,
  fetchCategorizedResults,
} from '../../lib/services/categorySearch';
import { pickStudioName } from '../../lib/utils/studio';
import styles from './MobileSearch.module.css';

const PEOPLE_PORTRAIT = (item) =>
  item?.images?.jpg?.image_url || item?.images?.webp?.image_url || null;

function AnimeRow({ item, t }) {
  const cover = getAnimeImageUrl(item);
  const studio = primaryStudioName(item) || '';
  const score = typeof item.score === 'number' ? item.score : null;
  return (
    <Link href={`/anime/${item.mal_id}`} className={styles.row}>
      <span className={`${styles.rowCover} ${styles.rowCoverAnime}`}>
        {cover ? <Image src={cover} alt="" fill sizes="48px" /> : null}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{item.title || '—'}</span>
        <span className={styles.rowSub}>
          {item.type || t('header.breadcrumb.anime')}
          {studio ? ` · ${studio}` : ''}
          {item.year ? ` · ${item.year}` : ''}
        </span>
      </span>
      {score !== null ? (
        <span className={styles.rowScore}>★ {formatFivePoint(score)}</span>
      ) : null}
    </Link>
  );
}

function CharacterRow({ item, t }) {
  const cover = PEOPLE_PORTRAIT(item);
  return (
    <Link href={`/characters/${item.mal_id}`} className={styles.row}>
      <span className={`${styles.rowCover} ${styles.rowCoverPerson}`}>
        {cover ? <Image src={cover} alt="" fill sizes="48px" /> : null}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{item.name || t('status.unknown')}</span>
        {item.name_kanji ? (
          <span className={styles.rowSub}>{item.name_kanji}</span>
        ) : null}
      </span>
    </Link>
  );
}

function VoiceRow({ item, t }) {
  const cover = PEOPLE_PORTRAIT(item);
  return (
    <Link href={`/voices/${item.mal_id}`} className={styles.row}>
      <span className={`${styles.rowCover} ${styles.rowCoverPerson}`}>
        {cover ? <Image src={cover} alt="" fill sizes="48px" /> : null}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{item.name || t('status.unknown')}</span>
        {item.given_name || item.family_name ? (
          <span className={styles.rowSub}>
            {[item.given_name, item.family_name].filter(Boolean).join(' ')}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function StudioRow({ item, t }) {
  const name = pickStudioName(item);
  return (
    <Link href={`/studios/${item.mal_id}`} className={styles.row}>
      <span className={`${styles.rowCover} ${styles.rowCoverStudio}`}>
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{name}</span>
        {Number.isFinite(item.count) ? (
          <span className={styles.rowSub}>
            {t('search.mobileWorksCount', { n: item.count })}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function Section({ title, count, total, children, seeAllHref, t }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionMeta}>
          {t('search.mobileSectionMeta', { shown: count, total: total.toLocaleString() })}
        </span>
      </div>
      <div className={styles.sectionList}>{children}</div>
      {seeAllHref && total > count ? (
        <Link href={seeAllHref} className={styles.seeAll}>
          {t('search.mobileSeeAll', { n: total.toLocaleString() })}
          <ArrowUpRight size={13} strokeWidth={2.25} />
        </Link>
      ) : null}
    </section>
  );
}

function MobileSearch({ inputValue, setInputValue, query, t }) {
  const trimmed = useMemo(() => (inputValue || '').trim(), [inputValue]);
  const [results, setResults] = useState(EMPTY_CATEGORY_RESULTS);
  const [loading, setLoading] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults(EMPTY_CATEGORY_RESULTS);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const value = await fetchCategorizedResults(trimmed, 5);
        if (!activeRef.current) return;
        setResults(value);
      } finally {
        if (activeRef.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const totalShown =
    results.anime.length +
    results.characters.length +
    results.people.length +
    results.studios.length;
  const hasQuery = trimmed.length >= 2;
  const hasNoResults = hasQuery && !loading && totalShown === 0;

  return (
    <div className={styles.mobileSearch}>
      <header className={styles.header}>
        <span className={styles.headerEyebrow}>{t('discoverPage.mobileEyebrow')}</span>
        <h1 className={styles.headerTitle}>{t('discoverPage.mobileTitle')}</h1>
        <div className={styles.searchInputWrap}>
          <Search size={16} strokeWidth={2} className={styles.searchIcon} />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('discoverPage.mobilePlaceholder')}
            className={styles.searchInput}
            aria-label={t('discoverPage.mobilePlaceholder')}
            autoFocus
          />
        </div>
      </header>

      {!hasQuery ? (
        <div className={styles.idle}>
          <span className={styles.idleHint}>{t('search.mobileIdleHint')}</span>
        </div>
      ) : loading ? (
        <div className={styles.status}>{t('header.searching')}</div>
      ) : hasNoResults ? (
        <div className={styles.status}>
          {t('search.mobileNoResults', { q: query || trimmed })}
        </div>
      ) : (
        <div className={styles.sections}>
          {results.anime.length > 0 ? (
            <Section
              title={t('header.searchSections.anime')}
              count={results.anime.length}
              total={results.totals.anime}
              seeAllHref={`/search?q=${encodeURIComponent(trimmed)}&kind=anime`}
              t={t}
            >
              {results.anime.map((item) => (
                <AnimeRow key={`a-${item.mal_id}`} item={item} t={t} />
              ))}
            </Section>
          ) : null}
          {results.characters.length > 0 ? (
            <Section
              title={t('header.searchSections.characters')}
              count={results.characters.length}
              total={results.totals.characters}
              t={t}
            >
              {results.characters.map((item) => (
                <CharacterRow key={`c-${item.mal_id}`} item={item} t={t} />
              ))}
            </Section>
          ) : null}
          {results.people.length > 0 ? (
            <Section
              title={t('header.searchSections.voiceActors')}
              count={results.people.length}
              total={results.totals.people}
              t={t}
            >
              {results.people.map((item) => (
                <VoiceRow key={`p-${item.mal_id}`} item={item} t={t} />
              ))}
            </Section>
          ) : null}
          {results.studios.length > 0 ? (
            <Section
              title={t('header.searchSections.studios')}
              count={results.studios.length}
              total={results.totals.studios}
              t={t}
            >
              {results.studios.map((item) => (
                <StudioRow key={`s-${item.mal_id}`} item={item} t={t} />
              ))}
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default translate(MobileSearch);
