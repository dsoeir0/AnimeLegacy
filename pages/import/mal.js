import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { translate } from 'react-switch-lang';
import { ArrowLeft, CheckCircle2, Download, Loader2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import useMyList from '../../hooks/useMyList';
import { FAVORITE_LIMIT } from '../../lib/constants';
import {
  listCharacterFavoriteIds,
  setCharacterFavorite,
} from '../../lib/services/favoriteCharacters';
import { healMissingAddedAt } from '../../lib/services/userList';
import {
  planFavoriteImport,
  summarizeImport,
  toImportPayload,
} from '../../lib/utils/malImport';
import styles from './mal.module.css';

// Small helper to poke Firestore at a safe cadence. Each `addItem` fans out
// to multiple writes (list doc + catalogue + user-anime + activity), so
// we don't want to unleash thousands in a single tick.
const IMPORT_CONCURRENCY = 3;

async function runInBatches(items, size, worker, onTick) {
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    await Promise.all(slice.map(worker));
    onTick?.(Math.min(i + size, items.length));
  }
}

const STEP_INPUT = 'input';
const STEP_PREVIEW = 'preview';
const STEP_IMPORTING = 'importing';
const STEP_DONE = 'done';

function MalImportPage({ t }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { list, addItem, hasLoaded, canEdit } = useMyList();
  const isAuthResolved = !authLoading;

  const [step, setStep] = useState(STEP_INPUT);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedItems, setFetchedItems] = useState([]);
  const [fetchedFavorites, setFetchedFavorites] = useState({ anime: [], characters: [] });
  const [existingCharFavIds, setExistingCharFavIds] = useState(new Set());
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [healedCount, setHealedCount] = useState(0);

  useEffect(() => {
    if (isAuthResolved && !user) router.replace('/sign-in');
  }, [isAuthResolved, user, router]);

  // One-shot self-heal for users who imported before the addedAt fix
  // landed. Silently backfills the field on any list doc that's missing
  // it so invisible entries resurface in /my-list without losing data.
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const n = await healMissingAddedAt(user.uid);
        if (!cancelled && n > 0) setHealedCount(n);
      } catch {
        // non-fatal; user can re-import as a fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const existingIds = useMemo(
    () => new Set((list || []).map((entry) => String(entry.id))),
    [list],
  );

  const existingAnimeFavCount = useMemo(
    () => (list || []).filter((entry) => entry?.isFavorite).length,
    [list],
  );

  const summary = useMemo(
    () => summarizeImport(fetchedItems, existingIds),
    [fetchedItems, existingIds],
  );

  // Snapshot character favourites once the user lands on the preview — we
  // need their count + ids to plan the character-favourite import.
  useEffect(() => {
    if (step !== STEP_PREVIEW || !user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = await listCharacterFavoriteIds(user.uid);
        if (!cancelled) setExistingCharFavIds(ids);
      } catch {
        // non-fatal — without the snapshot we may re-write an existing fav,
        // which is a no-op at the doc level but double-counts the aggregate
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, user?.uid]);

  const favoritePlan = useMemo(() => {
    const importedIds = new Set();
    for (const item of fetchedItems) {
      const payload = toImportPayload(item);
      if (!payload) continue;
      if (existingIds.has(String(payload.anime.id))) continue;
      importedIds.add(String(payload.anime.id));
    }
    return planFavoriteImport({
      animeFavorites: fetchedFavorites.anime,
      characterFavorites: fetchedFavorites.characters,
      importedAnimeIds: importedIds,
      existingAnimeFavCount,
      existingCharFavIds,
      existingCharFavCount: existingCharFavIds.size,
      limit: FAVORITE_LIMIT,
    });
  }, [
    fetchedItems,
    fetchedFavorites,
    existingIds,
    existingAnimeFavCount,
    existingCharFavIds,
  ]);

  const handleFetch = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `/api/mal-import?username=${encodeURIComponent(username.trim())}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = body?.error || 'mal_network_failed';
        const map = {
          invalid_username: 'import.mal.errors.invalidUsername',
          user_not_found: 'import.mal.errors.userNotFound',
          list_private: 'import.mal.errors.listPrivate',
          mal_network_failed: 'import.mal.errors.networkFailed',
        };
        setError(t(map[key] || 'import.mal.errors.networkFailed'));
        return;
      }
      if (!body?.items?.length) {
        setError(t('import.mal.errors.emptyList'));
        return;
      }
      setFetchedItems(body.items);
      setFetchedFavorites({
        anime: Array.isArray(body?.favorites?.anime) ? body.favorites.anime : [],
        characters: Array.isArray(body?.favorites?.characters)
          ? body.favorites.characters
          : [],
      });
      setStep(STEP_PREVIEW);
    } catch {
      setError(t('import.mal.errors.networkFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setStep(STEP_IMPORTING);
    setProgress(0);

    const payloads = [];
    for (const item of fetchedItems) {
      const payload = toImportPayload(item);
      if (!payload) continue;
      if (existingIds.has(String(payload.anime.id))) continue;
      payloads.push(payload);
    }

    let imported = 0;
    let failed = 0;
    let favoriteAnimeImported = 0;
    await runInBatches(
      payloads,
      IMPORT_CONCURRENCY,
      async (payload) => {
        const isFav = favoritePlan.animeFavoriteIds.has(String(payload.anime.id));
        try {
          // NOTE: do NOT pass `keepAddedAt: true` here. `useMyList` queries
          // with `orderBy('addedAt', 'desc')` which excludes documents that
          // don't have the field, so imports without `addedAt` become
          // invisible to the my-list view (even though the data exists and
          // shows up in profile aggregates). See incident 2026-04-23.
          const ok = await addItem(payload.anime, {
            ...payload.options,
            ...(isFav ? { isFavorite: true } : {}),
          });
          if (ok) {
            imported += 1;
            if (isFav) favoriteAnimeImported += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      },
      (done) => setProgress(done),
    );

    // Character favourites write path. Shared with the character-page
    // favourite toggle via lib/services/favoriteCharacters.js so both
    // places stay in lock-step on the "write user doc + bump aggregate"
    // invariant. Sequential, not parallel — keeps the aggregate counter
    // write order predictable if two deltas hit the same document.
    let charFavsImported = 0;
    let charFavsFailed = 0;
    if (favoritePlan.characters.length && user?.uid) {
      for (const char of favoritePlan.characters) {
        try {
          const ok = await setCharacterFavorite({ uid: user.uid, character: char });
          if (ok) charFavsImported += 1;
          else charFavsFailed += 1;
        } catch {
          charFavsFailed += 1;
        }
      }
    }

    setResult({
      imported,
      failed,
      skipped: summary.skipped,
      unsupported: summary.unsupported,
      favoriteAnimeImported,
      favoriteAnimeSkipped: favoritePlan.skippedAnime,
      charFavsImported,
      charFavsFailed,
      charFavsSkipped: favoritePlan.skippedChars,
    });
    setStep(STEP_DONE);
  };

  const handleReset = () => {
    setStep(STEP_INPUT);
    setFetchedItems([]);
    setProgress(0);
    setError('');
    setResult(null);
  };

  const importableCount = summary.total;
  const totalQueued = fetchedItems.length;

  return (
    <Layout
      title={t('import.mal.metaTitle')}
      description={t('import.mal.metaDesc')}
    >
      <div className={styles.page}>
        <Link href="/my-list" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>{t('import.mal.backToList')}</span>
        </Link>

        <header className={styles.head}>
          <div className={styles.eyebrow}>{t('import.mal.eyebrow')}</div>
          <h1 className={styles.heading}>
            {t('import.mal.titleStart')}{' '}
            <span className={styles.headingGrad}>{t('import.mal.titleEnd')}</span>
          </h1>
          <p className={styles.subtitle}>{t('import.mal.subtitle')}</p>
        </header>

        {healedCount > 0 ? (
          <div className={styles.healBanner} role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{t('import.mal.healed', { n: healedCount })}</span>
          </div>
        ) : null}

        {!isAuthResolved || !hasLoaded ? (
          <div className={styles.card}>
            <div className={styles.loadingRow}>
              <Loader2 size={16} className={styles.spin} aria-hidden="true" />
              <span>{t('import.mal.loading')}</span>
            </div>
          </div>
        ) : !canEdit ? (
          <div className={styles.card}>
            <p className={styles.helper}>{t('import.mal.signInRequired')}</p>
          </div>
        ) : step === STEP_INPUT ? (
          <form className={styles.card} onSubmit={handleFetch}>
            <label className={styles.label} htmlFor="mal-username">
              {t('import.mal.usernameLabel')}
            </label>
            <div className={styles.inputRow}>
              <input
                id="mal-username"
                type="text"
                className={styles.input}
                placeholder="Xinil"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck="false"
                required
                maxLength={16}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={loading ? Loader2 : Download}
                disabled={loading || username.trim().length < 2}
              >
                {loading ? t('import.mal.fetching') : t('import.mal.fetchList')}
              </Button>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <p className={styles.helper}>{t('import.mal.usernameHelper')}</p>
          </form>
        ) : step === STEP_PREVIEW ? (
          <div className={styles.card}>
            <div className={styles.previewHead}>
              <div className={styles.previewUser}>
                <span className={styles.previewUserLabel}>
                  {t('import.mal.previewFor')}
                </span>
                <span className={styles.previewUserName}>@{username.trim()}</span>
              </div>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={handleReset}
              >
                {t('import.mal.changeUser')}
              </button>
            </div>

            <div className={styles.statGrid}>
              <PreviewStat label={t('import.mal.stats.total')} value={totalQueued} highlight />
              <PreviewStat
                label={t('import.mal.stats.willImport')}
                value={importableCount}
              />
              <PreviewStat
                label={t('import.mal.stats.alreadyInList')}
                value={summary.skipped}
                muted
              />
              {summary.unsupported ? (
                <PreviewStat
                  label={t('import.mal.stats.unsupported')}
                  value={summary.unsupported}
                  muted
                />
              ) : null}
            </div>

            <div className={styles.breakdown}>
              <div className={styles.breakdownLabel}>{t('import.mal.breakdown')}</div>
              <BreakdownRow
                label={t('status.watching')}
                value={summary.byStatus.watching}
              />
              <BreakdownRow
                label={t('status.completed')}
                value={summary.byStatus.completed}
              />
              <BreakdownRow
                label={t('status.onHold')}
                value={summary.byStatus.on_hold}
              />
              <BreakdownRow
                label={t('status.dropped')}
                value={summary.byStatus.dropped}
              />
              <BreakdownRow
                label={t('status.plan')}
                value={summary.byStatus.plan}
              />
              <BreakdownRow
                label={t('import.mal.stats.withRating')}
                value={summary.withRating}
                muted
              />
            </div>

            {(favoritePlan.animeFavoriteIds.size || favoritePlan.characters.length) ? (
              <div className={styles.breakdown}>
                <div className={styles.breakdownLabel}>
                  {t('import.mal.favoritesBreakdown')}
                </div>
                <BreakdownRow
                  label={t('import.mal.favoriteAnime')}
                  value={favoritePlan.animeFavoriteIds.size}
                />
                <BreakdownRow
                  label={t('import.mal.favoriteCharacters')}
                  value={favoritePlan.characters.length}
                />
                {favoritePlan.skippedAnime || favoritePlan.skippedChars ? (
                  <BreakdownRow
                    label={t('import.mal.favoritesSkippedCap')}
                    value={favoritePlan.skippedAnime + favoritePlan.skippedChars}
                    muted
                  />
                ) : null}
              </div>
            ) : null}

            <div className={styles.noticeBox}>
              <p>{t('import.mal.mergeNotice')}</p>
            </div>

            <div className={styles.previewActions}>
              <Button variant="secondary" size="md" onClick={handleReset}>
                {t('actions.cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Download}
                onClick={handleImport}
                disabled={importableCount === 0}
              >
                {t('import.mal.confirmImport', { n: importableCount })}
              </Button>
            </div>
          </div>
        ) : step === STEP_IMPORTING ? (
          <div className={styles.card}>
            <div className={styles.loadingRow}>
              <Loader2 size={16} className={styles.spin} aria-hidden="true" />
              <span>
                {t('import.mal.importing', {
                  done: Math.min(progress, importableCount),
                  total: importableCount,
                })}
              </span>
            </div>
            <div className={styles.progressBar} aria-hidden="true">
              <div
                className={styles.progressFill}
                style={{
                  width: `${importableCount ? Math.min(100, (progress / importableCount) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ) : result ? (
          <div className={styles.card}>
            <div className={styles.doneBadge}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>{t('import.mal.done.title', { n: result.imported })}</span>
            </div>
            <ul className={styles.doneList}>
              <li>{t('import.mal.done.imported', { n: result.imported })}</li>
              {result.favoriteAnimeImported ? (
                <li>
                  {t('import.mal.done.favoriteAnime', { n: result.favoriteAnimeImported })}
                </li>
              ) : null}
              {result.charFavsImported ? (
                <li>
                  {t('import.mal.done.favoriteCharacters', { n: result.charFavsImported })}
                </li>
              ) : null}
              {result.skipped ? (
                <li>{t('import.mal.done.skipped', { n: result.skipped })}</li>
              ) : null}
              {result.unsupported ? (
                <li>{t('import.mal.done.unsupported', { n: result.unsupported })}</li>
              ) : null}
              {result.failed || result.charFavsFailed ? (
                <li className={styles.doneFailed}>
                  {t('import.mal.done.failed', {
                    n: (result.failed || 0) + (result.charFavsFailed || 0),
                  })}
                </li>
              ) : null}
            </ul>
            <div className={styles.previewActions}>
              <Button variant="secondary" size="md" onClick={handleReset}>
                {t('import.mal.done.importAnother')}
              </Button>
              <Link href="/my-list" className={styles.linkAsButton}>
                <Button variant="primary" size="md">
                  {t('import.mal.done.viewList')}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

function PreviewStat({ label, value, highlight = false, muted = false }) {
  return (
    <div
      className={`${styles.stat} ${highlight ? styles.statHighlight : ''} ${muted ? styles.statMuted : ''}`}
    >
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function BreakdownRow({ label, value, muted = false }) {
  return (
    <div className={`${styles.breakdownRow} ${muted ? styles.breakdownRowMuted : ''}`}>
      <span>{label}</span>
      <span className={styles.breakdownValue}>{value}</span>
    </div>
  );
}

export default translate(MalImportPage);
