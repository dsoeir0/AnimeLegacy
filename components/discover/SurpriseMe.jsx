import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { primaryStudioName } from '../../lib/utils/anime';
import { getAnimeBannerUrl, getAnimeImageUrl } from '../../lib/utils/media';
import styles from './discover.module.css';

const HISTORY_MAX = 4;
const genreName = (g) => (typeof g === 'string' ? g : g?.name || '');

function SurpriseMe({ pool, t }) {
  const safePool = useMemo(
    () => (Array.isArray(pool) ? pool.filter((a) => a?.mal_id) : []),
    [pool],
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [rollingIdx, setRollingIdx] = useState(0);
  const [historyIds, setHistoryIds] = useState([]);
  const [rolling, setRolling] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const displayIdx = rolling ? rollingIdx : currentIdx;
  const pick = safePool[displayIdx % Math.max(safePool.length, 1)] || null;

  const historyAnime = useMemo(() => {
    return historyIds
      .slice()
      .reverse()
      .map((id) => safePool.find((a) => a.mal_id === id))
      .filter(Boolean);
  }, [historyIds, safePool]);

  const roll = () => {
    if (rolling || safePool.length === 0) return;
    setRolling(true);

    const recent = new Set(historyIds.slice(-HISTORY_MAX));
    const currentId = safePool[currentIdx]?.mal_id;
    if (currentId) recent.add(currentId);
    const candidates = safePool
      .map((_, i) => i)
      .filter((i) => !recent.has(safePool[i]?.mal_id));
    const fromPool =
      candidates.length > 0 ? candidates : safePool.map((_, i) => i);
    const finalIdx = fromPool[Math.floor(Math.random() * fromPool.length)];

    if (currentId) {
      setHistoryIds((h) => [...h, currentId].slice(-HISTORY_MAX));
    }

    let count = 0;
    intervalRef.current = setInterval(() => {
      setRollingIdx(Math.floor(Math.random() * safePool.length));
      count += 1;
      if (count > 10) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setCurrentIdx(finalIdx);
        setRolling(false);
      }
    }, 70);
  };

  if (!pick) return null;

  const studio = primaryStudioName(pick) || (pick.year ? String(pick.year) : '—');
  const synopsis =
    pick.synopsis && typeof pick.synopsis === 'string'
      ? pick.synopsis.replace(/\s+/g, ' ').slice(0, 180)
      : '';
  const posterUrl = getAnimeImageUrl(pick);
  const bannerUrl = pick.banner || getAnimeBannerUrl(pick);

  return (
    <div className={styles.surprise}>
      {bannerUrl ? (
        <div
          className={`${styles.surpriseBackdrop} ${rolling ? styles.surpriseBackdropRolling : ''}`}
        >
          <Image
            key={pick.mal_id}
            src={bannerUrl}
            alt=""
            fill
            sizes="100vw"
            className={styles.surpriseBackdropImg}
            loading="lazy"
          />
          <div className={styles.surpriseBackdropOverlay} />
        </div>
      ) : null}

      <div className={styles.surpriseInner}>
        <div className={styles.surpriseLeft}>
          <div className={`${styles.sectionEyebrow} ${styles.surpriseEyebrow}`}>
            {t('discoverPage.surprise.eyebrow')}
          </div>
          <h2 className={styles.surpriseTitle}>
            {t('discoverPage.surprise.headingPrefix')}
            <span className={styles.surpriseTitleAccent}>
              {t('discoverPage.surprise.headingAccent')}
            </span>
            {t('discoverPage.surprise.headingSuffix')}
          </h2>
          <p className={styles.surpriseBody}>
            {t('discoverPage.surprise.body')}
          </p>
          <button
            type="button"
            onClick={roll}
            disabled={rolling}
            className={styles.surpriseCta}
          >
            <Sparkles size={16} strokeWidth={2.2} />
            {rolling ? t('discoverPage.surprise.ctaRolling') : t('discoverPage.surprise.cta')}
          </button>

          {historyAnime.length > 0 ? (
            <div className={styles.surpriseHistory}>
              <div
                className={`${styles.sectionEyebrow} ${styles.surpriseHistoryEyebrow}`}
              >
                {t('discoverPage.surprise.historyEyebrow')}
              </div>
              <div className={styles.surpriseHistoryRow}>
                {historyAnime.map((h, i) => {
                  const hPoster = getAnimeImageUrl(h);
                  return (
                    <Link
                      key={`${h.mal_id}-${i}`}
                      href={`/anime/${h.mal_id}`}
                      title={h.title}
                      className={styles.surpriseHistoryPip}
                      style={{ opacity: 0.95 - i * 0.18 }}
                    >
                      {hPoster ? (
                        <Image
                          src={hPoster}
                          alt=""
                          fill
                          sizes="36px"
                          className={styles.surpriseHistoryImg}
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <Link
          href={`/anime/${pick.mal_id}`}
          className={`${styles.surpriseResult} ${rolling ? styles.surpriseResultRolling : ''}`}
        >
          <div className={styles.surpriseResultPoster}>
            {posterUrl ? (
              <Image
                key={pick.mal_id}
                src={posterUrl}
                alt={pick.title}
                fill
                sizes="150px"
                className={styles.surpriseResultPosterImg}
              />
            ) : null}
          </div>
          <div className={styles.surpriseResultBody}>
            <div>
              <div
                className={`${styles.sectionEyebrow} ${styles.surpriseResultEyebrow}`}
              >
                {studio} · {pick.year || '—'}
              </div>
              <div className={styles.surpriseResultTitle}>{pick.title}</div>
              {synopsis ? (
                <div className={styles.surpriseResultSynopsis}>{synopsis}…</div>
              ) : null}
            </div>
            <div className={styles.surpriseResultFooter}>
              <div className={styles.surpriseResultGenres}>
                {(Array.isArray(pick.genres) ? pick.genres : [])
                  .slice(0, 2)
                  .map((g) => (
                    <span key={genreName(g)} className={styles.surpriseResultGenre}>
                      {genreName(g)}
                    </span>
                  ))}
              </div>
              {typeof pick.score === 'number' ? (
                <div className={styles.surpriseResultScore}>
                  <Star size={12} className={styles.surpriseResultStarIcon} />
                  <span className={styles.surpriseResultScoreNum}>
                    {pick.score.toFixed(2)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default translate(SurpriseMe);
