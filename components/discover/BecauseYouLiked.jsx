import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Shuffle } from 'lucide-react';
import { translate } from 'react-switch-lang';
import PosterCard from '../cards/PosterCard';
import useMyList from '../../hooks/useMyList';
import {
  candidatePool,
  fallbackByGenre,
  pickRandomAnchor,
} from '../../lib/utils/discoverRecs';
import styles from './discover.module.css';

function BecauseYouLiked({ pool, t }) {
  const { list, isInList } = useMyList();
  const [anchorId, setAnchorId] = useState(null);
  const [apiRecs, setApiRecs] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchRecs = useCallback(
    async (id) => {
      if (apiRecs[id]) return apiRecs[id];
      try {
        const res = await fetch(`/api/anime-recs?id=${id}`);
        if (!res.ok) return [];
        const payload = await res.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setApiRecs((prev) => ({ ...prev, [id]: data }));
        return data;
      } catch {
        return [];
      }
    },
    [apiRecs],
  );

  const switchAnchor = useCallback(
    async (next) => {
      if (!next?.id || loading) return;
      setLoading(true);
      await fetchRecs(Number(next.id));
      setAnchorId(Number(next.id));
      setLoading(false);
    },
    [fetchRecs, loading],
  );

  useEffect(() => {
    if (anchorId) {
      const stillValid = (Array.isArray(list) ? list : []).some(
        (e) => Number(e?.id) === Number(anchorId),
      );
      if (stillValid) return;
    }
    const candidates = candidatePool(list);
    if (candidates.length === 0) return;
    const next = pickRandomAnchor(candidates);
    if (next?.id) switchAnchor(next);
  }, [list, anchorId, switchAnchor]);

  const anchor = useMemo(
    () =>
      anchorId
        ? list.find((e) => Number(e?.id) === Number(anchorId)) || null
        : null,
    [list, anchorId],
  );

  const blockedIds = useMemo(
    () =>
      new Set(
        (Array.isArray(list) ? list : [])
          .map((e) => Number(e?.id))
          .filter((n) => Number.isFinite(n)),
      ),
    [list],
  );

  const recs = useMemo(() => {
    if (!anchor) return [];
    const fromApi = (apiRecs[anchor.id] || []).filter(
      (a) =>
        Number.isFinite(a?.mal_id) &&
        Number(a.mal_id) !== Number(anchor.id) &&
        !blockedIds.has(Number(a.mal_id)),
    );
    if (fromApi.length >= 6) return fromApi.slice(0, 6);
    const apiIds = new Set(fromApi.map((a) => Number(a.mal_id)));
    const supplementBlocked = new Set([
      ...blockedIds,
      ...apiIds,
      Number(anchor.id),
    ]);
    const supplement = fallbackByGenre(anchor, pool, supplementBlocked).slice(
      0,
      6 - fromApi.length,
    );
    return [...fromApi, ...supplement];
  }, [anchor, apiRecs, blockedIds, pool]);

  const candidates = candidatePool(list);
  const canShuffle = candidates.length > 1;

  const shuffle = () => {
    if (loading) return;
    const next = pickRandomAnchor(candidates, anchorId);
    if (next?.id) switchAnchor(next);
  };

  if (!anchor || recs.length < 6) return null;

  return (
    <>
      <div className={styles.becauseHead}>
        <div className={styles.becauseAnchor}>
          {anchor.image ? (
            <div className={styles.becauseAnchorPoster}>
              <Image
                src={anchor.image}
                alt=""
                fill
                sizes="48px"
                className={styles.becauseAnchorImg}
              />
            </div>
          ) : null}
          <div>
            <div className={`${styles.sectionEyebrow} ${styles.becauseEyebrow}`}>
              {t('discoverPage.becauseYouLiked.eyebrow')}
            </div>
            <h2 className={styles.becauseTitle}>
              {t('discoverPage.becauseYouLiked.headingPrefix')}
              {' '}
              <span className={styles.becauseAnchorName}>{anchor.title}</span>
              {' '}
              {t('discoverPage.becauseYouLiked.headingSuffix')}
            </h2>
          </div>
        </div>
        {canShuffle ? (
          <button
            type="button"
            onClick={shuffle}
            disabled={loading}
            className={styles.moodShuffle}
            aria-label={t('discoverPage.becauseYouLiked.shuffle')}
          >
            <Shuffle size={14} strokeWidth={2.2} />
            <span>{t('discoverPage.becauseYouLiked.shuffle')}</span>
          </button>
        ) : null}
      </div>
      <div className={styles.becauseGrid}>
        {recs.map((a) => (
          <PosterCard
            key={a.mal_id}
            anime={a}
            width="100%"
            href={`/anime/${a.mal_id}`}
            inList={isInList(a.mal_id)}
          />
        ))}
      </div>
    </>
  );
}

export default translate(BecauseYouLiked);
