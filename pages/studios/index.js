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
import { getAnimeByProducer, getProducers } from '../../lib/services/jikan';
import { filterOutHentai } from '../../lib/utils/anime';
import { classifyProducerRole } from '../../lib/utils/studio';
import styles from './index.module.css';

// Founding-year bands used by the filter bar. Arbitrary but match how the
// industry is usually grouped in writing about studios.
const FILTER_ALL = 'all';
const FILTER_VETERAN = 'veteran';   // founded 1995 or earlier
const FILTER_ACTIVE = 'active';     // founded 1996–2014
const FILTER_NEW_WAVE = 'new_wave'; // founded 2015+

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
  const lastPage = pagination?.last_visible_page || 1;
  const go = (p) => router.push({ pathname: '/studios', query: { page: p } });

  // `featuredIndex` is resolved server-side so we pick the first actual
  // animation studio on the page (skipping leading producers like Aniplex).
  // Everything else goes into the grid — the client-side sweep hides any
  // producers from the grid as it discovers them.
  const featured = items[featuredIndex];
  const rest = items.filter((_, i) => i !== featuredIndex);

  // Progressive poster loading for the grid cards. Firing all 24 fetches
  // during SSR burns through Jikan's 3 req/sec limit and half of them come
  // back empty in an all-or-nothing rate-limit dance. Instead we let the
  // page hydrate instantly with empty posters, then fill in from the client
  // in small chunks so each request respects the rate limit and the user
  // sees a progressive enhancement instead of a broken half-populated grid.
  //
  // The same sweep also classifies each entity as a studio (appears in
  // `anime.studios`) or a producer (only appears in `anime.producers`).
  // Jikan's `/producers` endpoint returns both kinds flattened together,
  // with no type field. We hide the producer cards as we discover them —
  // this is the only reliable way to keep /studios truly studios-only.
  //
  // The effect depends on a STABLE id signature (not `items.slice(1)` or
  // the array itself), because every `setPostersByStudio` call inside the
  // sweep triggers a re-render, which would otherwise rebuild the array
  // reference and re-fire this effect — looping forever and wiping state
  // before any batch could ever land. Use the prop reference directly.
  const [filter, setFilter] = useState(FILTER_ALL);
  const [postersByStudio, setPostersByStudio] = useState({});
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const fetchRunId = useRef(0);

  const visibleRest = useMemo(() => {
    const onlyStudios = rest.filter((s) => !hiddenIds.has(String(s.mal_id)));
    if (filter === FILTER_ALL) return onlyStudios;
    return onlyStudios.filter((s) => matchesFilter(yearOf(s.established), filter));
  }, [filter, rest, hiddenIds]);

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

    // 2-wide concurrency + 450ms inter-batch delay → 3 req/s average,
    // safely within Jikan's limit. For 23 studios: ~5s to fully populate.
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

  // SSR only fetches one studio's anime (the featured), not all 24 —
  // doing so would blow Jikan's 3 req/s limit and the rate-limit lottery
  // was leaving half the grid empty. Grid posters are fetched client-side
  // via /api/studio-posters (batched 2-wide, 450ms apart).
  //
  // The top-of-page "featured" slot has to be an animation studio, not a
  // producer. Jikan's /producers endpoint flattens both kinds together
  // and sorts them by favourites, so the most-favourited entry on a page
  // can be e.g. Aniplex. Walk down the list until we find the first entry
  // that has anime in its studios[] role, then promote that to featured.
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
      // keep scanning; a transient 429 on one candidate shouldn't stop
      // us from finding a studio further down.
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
