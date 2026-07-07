import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Bookmark,
  Pencil,
  Play,
  Plus,
} from 'lucide-react';
import { translate } from 'react-switch-lang';
import { formatFivePoint } from '../../lib/utils/rating';
import { toJsDate } from '../../lib/utils/profileActivity';
import styles from './MobileAnimeDetail.module.css';

const formatStartedDate = (value, lang) => {
  const d = toJsDate(value);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(lang || 'en', { month: 'short', day: 'numeric' })
      .format(d)
      .toUpperCase();
  } catch {
    return '';
  }
};

function MobileAnimeDetail({
  data,
  banner,
  poster,
  seasonLabel,
  studioName,
  score,
  episodesCount,
  statusLabel,
  ratingLabel,
  currentEntry,
  normalized,
  onOpenAdd,
  onOpenRating,
  onAdvanceProgress,
  t,
}) {
  const router = useRouter();
  const progress = typeof currentEntry?.progress === 'number' ? currentEntry.progress : 0;
  const pct = episodesCount > 0 ? Math.min(100, (progress / episodesCount) * 100) : 0;
  const startedDate = currentEntry?.addedAt
    ? formatStartedDate(currentEntry.addedAt)
    : '';

  return (
    <div className={styles.mobileDetail}>
      <div className={styles.bannerWrap}>
        {banner ? (
          <Image src={banner} alt={normalized?.title || ''} fill priority sizes="100vw" className={styles.bannerImg} />
        ) : null}
        <div className={styles.bannerGradTop} />
        <div className={styles.bannerGradBottom} />

        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.glassBtn}
            aria-label={t('actions.back')}
            onClick={() => router.back()}
          >
            <ArrowLeft size={14} strokeWidth={2.2} />
          </button>
        </div>

        <div className={styles.heroFloat}>
          <div className={styles.poster}>
            {poster ? (
              <Image src={poster} alt={data?.title || ''} fill sizes="120px" />
            ) : null}
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroEyebrow}>
              {seasonLabel ? seasonLabel.toUpperCase() : ''}
              {seasonLabel && studioName ? ' · ' : ''}
              {studioName ? studioName.toUpperCase() : ''}
            </div>
            <h1 className={styles.heroTitle}>{data?.title || ''}</h1>
            {data?.title_japanese ? (
              <div className={styles.heroSubTitle}>{data.title_japanese}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.metaStrip}>
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>{t('anime.malScore')}</span>
          <span className={`${styles.metaValue} ${styles.metaValueAccent}`}>
            {score ? formatFivePoint(score) : '—'}
          </span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>{t('anime.episodes')}</span>
          <span className={styles.metaValue}>{episodesCount || '—'}</span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>{t('anime.statusLabel')}</span>
          <span
            className={`${styles.metaValue} ${data?.airing ? styles.metaValueAiring : ''}`}
          >
            {statusLabel}
          </span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>{t('anime.mobileRated')}</span>
          <span className={styles.metaValue}>{ratingLabel || '—'}</span>
        </div>
      </div>

      {currentEntry ? (
        <div className={styles.progressCard}>
          <div className={styles.progressHead}>
            <span className={styles.progressEyebrow}>
              {t('anime.mobileProgressEyebrow', { status: t(`myList.tabs.${currentEntry.status || 'watching'}`) })}
            </span>
            {startedDate ? (
              <span className={styles.progressStarted}>
                {t('anime.mobileStarted', { date: startedDate })}
              </span>
            ) : null}
          </div>
          <div className={styles.progressRow}>
            <span className={styles.progressNum}>
              {t('anime.mobileEp', { n: progress })}
              {episodesCount ? (
                <span className={styles.progressNumSlash}> / {episodesCount}</span>
              ) : null}
            </span>
            {episodesCount > 0 ? (
              <span className={styles.progressPct}>
                {t('anime.mobileThrough', { pct: Math.round(pct) })}
              </span>
            ) : null}
          </div>
          {episodesCount > 0 ? (
            <span className={styles.progressBar}>
              <span className={styles.progressFill} style={{ width: `${pct}%` }} />
            </span>
          ) : null}
          <div className={styles.progressActions}>
            <button type="button" className={styles.progressBtn} onClick={onAdvanceProgress}>
              <Plus size={12} strokeWidth={2.5} />
              {t('anime.mobileEpNum', { n: progress + 1 })}
            </button>
            <button type="button" className={styles.progressBtn} onClick={onOpenRating}>
              {t('anime.mobileUpdateScore')}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.bottomCta}>
        <button
          type="button"
          className={`${styles.cta} ${currentEntry ? styles.ctaInList : ''}`}
          onClick={() => onOpenAdd(normalized, currentEntry)}
        >
          {currentEntry ? (
            <>
              <Bookmark size={14} strokeWidth={2.2} fill="currentColor" />
              {t('actions.inYourList')}
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2.6} />
              {t('actions.addToList')}
            </>
          )}
        </button>
        {data?.trailer?.embed_url ? (
          <a href="#trailer" className={styles.ctaPlay} aria-label={t('actions.watchTrailer')}>
            <Play size={16} strokeWidth={0} fill="currentColor" />
          </a>
        ) : currentEntry ? (
          <button
            type="button"
            className={styles.ctaPlay}
            onClick={onOpenRating}
            aria-label={t('actions.rate')}
          >
            <Pencil size={14} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default translate(MobileAnimeDetail);
