import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { getAnimeThumbUrl } from '../../lib/utils/media';
import { pickStudioName, studioInitial } from '../../lib/utils/studio';
import { formatFivePoint } from '../../lib/utils/rating';
import { firstSentence, truncateText } from '../../lib/utils/text';
import styles from './MobileStudioDetail.module.css';

const CURRENT_YEAR = new Date().getFullYear();

const japaneseTitle = (producer) => {
  if (!Array.isArray(producer?.titles)) return '';
  const jp = producer.titles.find((t) => /japanese/i.test(t?.type || ''));
  return jp?.title || '';
};

function MobileStudioDetail({
  producer,
  works,
  accent,
  topScoreBest,
  avgScoreValue,
  airingCount,
  isFavorite,
  favoriteError,
  favoriteLoaded,
  onToggleFavorite,
  canFavorite,
  t,
}) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [worksExpanded, setWorksExpanded] = useState(false);

  const name = pickStudioName(producer);
  const initial = studioInitial(name);
  const established = producer?.established
    ? new Date(producer.established).getFullYear()
    : null;
  const yearsActive =
    established && CURRENT_YEAR - established > 0 ? CURRENT_YEAR - established : null;
  const jpName = japaneseTitle(producer);
  const aboutText = producer?.about || '';
  const tagline = firstSentence(aboutText);
  const officialUrl =
    Array.isArray(producer?.external) && producer.external[0]?.url
      ? producer.external[0].url
      : null;

  const selectedWorks = worksExpanded ? works : works.slice(0, 6);
  const hasMore = works.length > 6;

  return (
    <div className={styles.mobile}>
      <button
        type="button"
        className={styles.backBtn}
        aria-label={t('actions.back')}
        onClick={() => router.back()}
      >
        <ArrowLeft size={14} strokeWidth={2.2} />
      </button>

      <div
        className={styles.heroGlow}
        style={{
          background: `radial-gradient(circle, ${accent.base}33 0%, transparent 65%)`,
        }}
        aria-hidden="true"
      />

      <div className={styles.hero}>
        <div
          className={styles.logo}
          style={{
            background: `linear-gradient(135deg, ${accent.base}, color-mix(in srgb, ${accent.base} 60%, var(--al-ink-0)))`,
            boxShadow: `0 22px 50px ${accent.base}40`,
          }}
        >
          {initial}
        </div>
        <span className={styles.eyebrow}>
          {established ? t('studioPage.hero.eyebrow', { year: established }) : t('studioPage.hero.eyebrowNoYear')}
        </span>
        <h1 className={styles.title}>{name}</h1>
        {jpName ? <div className={styles.subtitle}>{jpName}</div> : null}
        {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={`${styles.ctaPrimary} ${isFavorite ? styles.ctaPrimaryOn : ''}`}
          onClick={onToggleFavorite}
          disabled={!canFavorite || !favoriteLoaded}
        >
          <Star size={14} strokeWidth={2.2} fill={isFavorite ? 'currentColor' : 'none'} />
          {isFavorite ? t('actions.favorited') : t('actions.favorite')}
        </button>
        {officialUrl ? (
          <a
            href={officialUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.ctaSecondary}
          >
            {t('studio.mobileWebsite')}
            <ExternalLink size={12} strokeWidth={2.2} />
          </a>
        ) : null}
      </div>

      {favoriteError ? <div className={styles.errorRow}>{favoriteError}</div> : null}

      <div className={styles.kpiStrip}>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>{producer?.count || works.length}</span>
          <span className={styles.kpiLabel}>{t('studio.mobileKpiWorks')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue} style={{ color: 'var(--al-warm-ink)' }}>
            {topScoreBest !== null ? formatFivePoint(topScoreBest) : '—'}
          </span>
          <span className={styles.kpiLabel}>{t('studio.mobileKpiTop')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>{yearsActive ?? '—'}</span>
          <span className={styles.kpiLabel}>{t('studio.mobileKpiYears')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>{airingCount || 0}</span>
          <span className={styles.kpiLabel}>{t('studio.mobileKpiAiring')}</span>
        </div>
      </div>

      {selectedWorks.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t('studio.mobileSelectedWorks')}</h2>
            <span className={styles.sectionMeta}>
              {t('studio.mobileWorksTotal', { n: works.length })}
            </span>
          </div>
          <div className={styles.workGrid}>
            {selectedWorks.map((anime) => {
              const cover = getAnimeThumbUrl(anime);
              const score = typeof anime.score === 'number' ? anime.score : null;
              const year =
                anime.year || anime?.aired?.prop?.from?.year || null;
              return (
                <Link
                  key={anime.mal_id}
                  href={`/anime/${anime.mal_id}`}
                  className={styles.workCard}
                >
                  <span className={styles.workPoster}>
                    {cover ? (
                      <Image src={cover} alt={anime.title || ''} fill sizes="(max-width: 768px) 33vw, 140px" />
                    ) : null}
                    {score !== null ? (
                      <span className={styles.workScore}>{formatFivePoint(score)}</span>
                    ) : null}
                    <span className={styles.workGradient} />
                  </span>
                  <span className={styles.workTitle}>{anime.title}</span>
                  {year ? <span className={styles.workYear}>{year}</span> : null}
                </Link>
              );
            })}
          </div>
          {hasMore ? (
            <button
              type="button"
              className={styles.bioToggle}
              onClick={() => setWorksExpanded((v) => !v)}
            >
              {worksExpanded
                ? t('actions.showLess')
                : t('studio.mobileWorksMore', { n: works.length - 6 })}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.statsCard}>
        <div className={styles.statsHead}>
          <span className={styles.statsEyebrow}>{t('studio.mobileSignalsEyebrow')}</span>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statsCell}>
            <span className={styles.statsLabel}>{t('studio.mobileStatAvg')}</span>
            <span className={styles.statsValue}>
              {avgScoreValue !== null ? formatFivePoint(avgScoreValue) : '—'}
            </span>
          </div>
          <div className={styles.statsCell}>
            <span className={styles.statsLabel}>{t('studio.mobileStatBest')}</span>
            <span
              className={styles.statsValue}
              style={{ color: 'var(--al-warm-ink)' }}
            >
              {topScoreBest !== null ? formatFivePoint(topScoreBest) : '—'}
            </span>
          </div>
        </div>
      </div>

      {aboutText ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('studio.mobileAboutTitle')}</h2>
          <p className={`${styles.bio} ${bioExpanded ? '' : styles.bioCollapsed}`}>
            {bioExpanded ? aboutText : truncateText(aboutText, 240)}
          </p>
          {aboutText.length > 240 ? (
            <button
              type="button"
              className={styles.bioToggle}
              onClick={() => setBioExpanded((v) => !v)}
            >
              {bioExpanded ? t('actions.showLess') : t('actions.readMore')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default translate(MobileStudioDetail);
