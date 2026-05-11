import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import IconButton from '../../components/ui/IconButton';
import StudiosHeader from '../../components/studios/StudiosHeader';
import FeaturedStudio from '../../components/studios/FeaturedStudio';
import StudioFilterBar from '../../components/studios/StudioFilterBar';
import StudioCard from '../../components/studios/StudioCard';
import useAuth from '../../hooks/useAuth';
import useFavoriteIds from '../../hooks/useFavoriteIds';
import { getAnimeByProducer, getProducers } from '../../lib/services/jikan';
import { setStudioFavorite, unsetStudioFavorite } from '../../lib/services/favoriteStudios';
import { FAVORITE_LIMIT } from '../../lib/constants';
import { filterOutHentai } from '../../lib/utils/anime';
import { classifyProducerRole, pickStudioName } from '../../lib/utils/studio';
import styles from './index.module.css';

const FILTER_ALL = 'all';
const FILTER_VETERAN = 'veteran';
const FILTER_ACTIVE = 'active';
const FILTER_NEW_WAVE = 'new_wave';

const FILTERS = [
  { id: FILTER_ALL, labelKey: 'studios.filters.all' },
  { id: FILTER_VETERAN, labelKey: 'studios.filters.veteran' },
  { id: FILTER_ACTIVE, labelKey: 'studios.filters.active' },
  { id: FILTER_NEW_WAVE, labelKey: 'studios.filters.newWave' },
];

const yearOf = (iso) => {
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? y : null;
};

const matchesFilter = (founded, filter) => {
  if (filter === FILTER_ALL) return true;
  if (!Number.isFinite(founded)) return false;
  if (filter === FILTER_VETERAN) return founded <= 1995;
  if (filter === FILTER_ACTIVE) return founded >= 1996 && founded <= 2014;
  if (filter === FILTER_NEW_WAVE) return founded >= 2015;
  return true;
};

function StudiosIndexPage({ items, portfolio, featuredIndex = 0, pagination, page, totals, t }) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, count: favCount, canEdit } = useFavoriteIds('favoriteStudios');
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/studios', query: { page: p } });

  const toggleStudioFavorite = (studio) => {
    if (!canEdit || !user?.uid) return;
    const id = String(studio.mal_id);
    if (isFavorite(id)) {
      unsetStudioFavorite({ uid: user.uid, studioId: id });
    } else if (favCount < FAVORITE_LIMIT) {
      setStudioFavorite({
        uid: user.uid,
        studio: {
          id,
          name: pickStudioName(studio) || '',
          established: studio?.established || '',
          imageUrl: studio?.images?.jpg?.image_url || '',
        },
      });
    }
  };

  const featured = items[featuredIndex];
  const rest = items.filter((_, i) => i !== featuredIndex);

  // Effect below depends on a STABLE id signature, not the array — setPostersByStudio
  // re-renders rebuild the array ref and would loop forever wiping state.
  const [filter, setFilter] = useState(FILTER_ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [postersByStudio, setPostersByStudio] = useState({});
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const fetchRunId = useRef(0);

  const visibleRest = useMemo(() => {
    const onlyStudios = rest.filter((s) => !hiddenIds.has(String(s.mal_id)));
    const byFilter =
      filter === FILTER_ALL
        ? onlyStudios
        : onlyStudios.filter((s) => matchesFilter(yearOf(s.established), filter));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter((s) => pickStudioName(s).toLowerCase().includes(q));
  }, [filter, rest, hiddenIds, searchQuery]);

  const restIdsSignature = useMemo(
    () =>
      rest
        .map((s) => s?.mal_id)
        .filter((id) => Number.isFinite(id))
        .join(','),
    [rest],
  );

  useEffect(() => {
    if (!restIdsSignature) return undefined;

    fetchRunId.current += 1;
    const runId = fetchRunId.current;
    setPostersByStudio({});
    setHiddenIds(new Set());

    const ids = restIdsSignature.split(',').map((n) => Number(n)).filter(Boolean);

    // 2-wide @ 450ms ≈ 3 req/s — within Jikan's rate limit
    const BATCH_SIZE = 2;
    const BATCH_DELAY_MS = 450;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    let cancelled = false;

    (async () => {
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        if (cancelled || fetchRunId.current !== runId) return;
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          chunk.map(async (id) => {
            try {
              const res = await fetch(`/api/studio-posters?id=${id}&limit=4`);
              if (!res.ok) return { id, posters: [], role: null };
              const body = await res.json();
              return {
                id,
                posters: Array.isArray(body?.items) ? body.items : [],
                role: body?.role || null,
              };
            } catch {
              return { id, posters: [], role: null };
            }
          }),
        );
        if (cancelled || fetchRunId.current !== runId) return;
        setPostersByStudio((prev) => {
          const next = { ...prev };
          for (const r of results) next[String(r.id)] = r.posters;
          return next;
        });
        setHiddenIds((prev) => {
          const next = new Set(prev);
          for (const r of results) {
            if (r.role && r.role !== 'studio') next.add(String(r.id));
          }
          return next;
        });
        if (i + BATCH_SIZE < ids.length) await sleep(BATCH_DELAY_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restIdsSignature]);

  return (
    <Layout title={t('studios.metaTitle')} description={t('studios.metaDesc')}>
      <div className={styles.page}>
        <StudiosHeader totals={totals} />

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>{t('studios.emptyTitle')}</h2>
            <p>{t('studios.emptyBody')}</p>
          </div>
        ) : null}

        {featured ? <FeaturedStudio studio={featured} portfolio={portfolio} /> : null}

        {rest.length > 0 ? (
          <>
            <StudioFilterBar
              filter={filter}
              onFilterChange={setFilter}
              visibleCount={visibleRest.length}
              filters={FILTERS}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />

            <section className={styles.gridSection}>
              <div className={styles.grid}>
                {visibleRest.map((s) => {
                  const postersEntry = postersByStudio[String(s.mal_id)];
                  return (
                    <StudioCard
                      key={s.mal_id}
                      studio={s}
                      posters={postersEntry || []}
                      postersLoading={postersEntry === undefined}
                      isFavorite={isFavorite(s.mal_id)}
                      onToggleFavorite={canEdit ? toggleStudioFavorite : undefined}
                    />
                  );
                })}
              </div>
            </section>
          </>
        ) : null}

        {lastPage > 1 ? (
          <div className={styles.pagination}>
            <IconButton
              icon={ChevronLeft}
              tooltip={t('actions.previousPage')}
              disabled={page === 1}
              onClick={() => go(Math.max(1, page - 1))}
            />
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
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

export default translate(StudiosIndexPage);

export async function getServerSideProps(context) {
  const page = Math.max(1, Number.parseInt(context.query?.page, 10) || 1);
  const response = await getProducers(page);
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};

  // /producers conflates studios+producers; walk down for the first true studio.
  let portfolio = [];
  let featuredIndex = 0;
  const MAX_FEATURED_SCAN = 4;
  for (let i = 0; i < Math.min(MAX_FEATURED_SCAN, items.length); i += 1) {
    const candidateId = items[i]?.mal_id;
    if (!candidateId) continue;
    try {
      const res = await getAnimeByProducer(candidateId, 1);
      const raw = Array.isArray(res?.data) ? filterOutHentai(res.data) : [];
      const { role, matches } = classifyProducerRole(raw, candidateId);
      if (role === 'studio' && matches.length) {
        featuredIndex = i;
        portfolio = matches.slice(0, 3).map((a) => ({
          mal_id: a.mal_id,
          title: a.title,
          score: typeof a.score === 'number' ? a.score : null,
          images: {
            webp: {
              image_url: a?.images?.webp?.image_url || null,
              large_image_url: a?.images?.webp?.large_image_url || null,
            },
            jpg: {
              image_url: a?.images?.jpg?.image_url || null,
              large_image_url: a?.images?.jpg?.large_image_url || null,
            },
          },
        }));
        break;
      }
    } catch {
      // 429 on one candidate — keep scanning
    }
  }

  const totalStudios = pagination?.items?.total || items.length;
  const totalProductions = items.reduce(
    (sum, s) => sum + (Number.isFinite(s?.count) ? s.count : 0),
    0,
  );

  return {
    props: {
      items,
      portfolio,
      featuredIndex,
      pagination,
      page,
      totals: { totalStudios, totalProductions },
    },
  };
}
