import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import IconButton from '../../components/ui/IconButton';
import MobileCharacters from '../../components/characters/MobileCharacters';
import CharacterOfMonthHero from '../../components/characters/CharacterOfMonthHero';
import CharacterCard from '../../components/characters/CharacterCard';
import CharactersFilterBar from '../../components/characters/CharactersFilterBar';
import {
  getAnimeById,
  getCharacterAnime,
  getCharacterById,
  getTopCharacters,
} from '../../lib/services/jikan';
import { isHentaiAnime } from '../../lib/utils/anime';
import {
  pickCharacterOfMonth,
  pickPrincipalRole,
} from '../../lib/utils/characterOfMonth';
import staticEnrichment from '../../lib/data/characterEnrichment.json';
import styles from './index.module.css';

function CharactersIndexPage({ items, pagination, page, totalIndexed, hero, t }) {
  const router = useRouter();
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) =>
    router.push({ pathname: '/characters', query: { page: p } });
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!isSearching) {
      setSearchResults(null);
      return undefined;
    }
    setSearchResults(null);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/characters-search?q=${encodeURIComponent(trimmedQuery)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setSearchResults(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, isSearching]);

  const enrich = (c) => {
    const extra = staticEnrichment[String(c.mal_id)];
    if (!extra) return c;
    return {
      ...c,
      role: extra.role || null,
      animeTitle: extra.animeTitle || null,
      voiceActor: extra.voiceActor || null,
    };
  };

  const isLoadingSearch = isSearching && searchResults === null;

  const displayedItems = useMemo(() => {
    if (isSearching) return (searchResults || []).map(enrich);
    return items.map(enrich);
  }, [items, isSearching, searchResults]);

  return (
    <Layout title={t('characters.metaTitle')} description={t('characters.metaDesc')} mobileTitle={t('nav.characters')}>
      <MobileCharacters items={items} totalIndexed={totalIndexed} />
      <div className={styles.page}>
        {hero ? (
          <CharacterOfMonthHero
            character={hero.character}
            animeTitle={hero.animeTitle}
            animeEpisodes={hero.animeEpisodes}
            role={hero.role}
            rank={hero.rank}
          />
        ) : null}

        {items.length > 0 ? (
          <CharactersFilterBar query={query} onQueryChange={setQuery} />
        ) : null}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>{t('characters.emptyTitle')}</h2>
            <p>{t('characters.emptyBody')}</p>
          </div>
        ) : isLoadingSearch ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} aria-hidden="true">
                <div className={styles.skeletonPoster} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            ))}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className={styles.empty}>
            <h2>{t('characters.noResultsTitle')}</h2>
            <p>{t('characters.noResultsBody')}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {displayedItems.map((c) => (
              <CharacterCard key={c.mal_id} character={c} />
            ))}
          </div>
        )}

        {lastPage > 1 && !isSearching ? (
          <div className={styles.pagination}>
            <IconButton
              icon={ChevronLeft}
              tooltip={t('actions.previousPage')}
              disabled={page === 1}
              onClick={() => go(Math.max(1, page - 1))}
            />
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => i + 1).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                  onClick={() => go(p)}
                >
                  {p}
                </button>
              ),
            )}
            {lastPage > 5 ? <span className={styles.pageDots}>…</span> : null}
            {lastPage > 5 ? (
              <button
                type="button"
                className={`${styles.pageBtn} ${page === lastPage ? styles.pageBtnActive : ''}`}
                onClick={() => go(lastPage)}
              >
                {lastPage}
              </button>
            ) : null}
            <IconButton
              icon={ChevronRight}
              tooltip={t('actions.nextPage')}
              disabled={page === lastPage}
              onClick={() => go(Math.min(lastPage, page + 1))}
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

export default translate(CharactersIndexPage);

export async function getServerSideProps(context) {
  const page = Math.max(1, Number.parseInt(context.query?.page, 10) || 1);
  const response = await getTopCharacters(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};
  const totalIndexed = pagination?.items?.total || items.length;

  let hero = null;
  const heroPool = Object.entries(staticEnrichment)
    .map(([id, v]) => ({
      mal_id: Number(id),
      favorites: v.favorites,
    }))
    .filter((c) => Number.isFinite(c.mal_id))
    .sort((a, b) => (b.favorites || 0) - (a.favorites || 0))
    .slice(0, 25);
  if (heroPool.length > 0) {
    const monthlyPick = pickCharacterOfMonth(heroPool);
    if (monthlyPick?.mal_id) {
      const [detailRes, animeRes] = await Promise.all([
        getCharacterById(monthlyPick.mal_id),
        getCharacterAnime(monthlyPick.mal_id),
      ]);
      const detail = detailRes?.data || monthlyPick;
      const rawAnimeList = Array.isArray(animeRes?.data) ? animeRes.data : [];
      const animeList = rawAnimeList.filter(
        (entry) => !isHentaiAnime(entry?.anime),
      );
      const principal = pickPrincipalRole(animeList);
      let principalEpisodes = principal?.anime?.episodes ?? null;
      if (principal?.anime?.mal_id && !Number.isFinite(principalEpisodes)) {
        const animeDetailRes = await getAnimeById(principal.anime.mal_id);
        const eps = animeDetailRes?.data?.episodes;
        if (Number.isFinite(eps)) principalEpisodes = eps;
      }
      const rankIndex = heroPool.findIndex((c) => c.mal_id === monthlyPick.mal_id);
      hero = {
        character: {
          mal_id: detail.mal_id,
          name: detail.name,
          images: detail.images,
          favorites: detail.favorites,
          about: detail.about,
        },
        animeTitle: principal?.anime?.title || null,
        animeEpisodes: principalEpisodes,
        role: principal?.role || null,
        rank: rankIndex >= 0 ? rankIndex + 1 : null,
      };
    }
  }

  return { props: { items, pagination, page, totalIndexed, hero } };
}
