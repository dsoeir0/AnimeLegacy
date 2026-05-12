import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { normalizeAnime, primaryStudioName } from '../../lib/utils/anime';
import { getAnimeBannerUrl, getAnimeImageUrl } from '../../lib/utils/media';
import { formatFivePoint } from '../../lib/utils/rating';
import { getSeasonFromDate } from '../../lib/utils/season';
import styles from './MobileHome.module.css';

const HERO_INTERVAL_MS = 7000;

function HeroSection({ slides, aniListMap, onOpenModal, getEntry, t }) {
  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const currentSeason = getSeasonFromDate();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[idx];
  const media = aniListMap?.[slide.mal_id];
  const banner =
    getAnimeBannerUrl(slide, media) || getAnimeImageUrl(slide, media);
  const studio = primaryStudioName(slide) || '';
  const score = typeof slide.score === 'number' ? slide.score : null;
  const scoredBy = Number(slide.scored_by || 0);
  const popularity = Number(slide.popularity || 0);
  const entry = slide.mal_id ? getEntry?.(String(slide.mal_id)) : null;

  return (
    <section className={styles.hero}>
      {banner ? (
        <Image
          key={slide.mal_id}
          src={banner}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
      ) : null}
      <div className={styles.heroGradientTop} />
      <div className={styles.heroGradientBottom} />

      <div className={styles.heroContent}>
        <div className={styles.heroEyebrow}>
          {t('home.heroEyebrow', {
            season: currentSeason?.toUpperCase(),
            year: currentYear,
          })}
        </div>
        <h1 className={styles.heroTitle}>{slide.title}</h1>
        <div className={styles.heroMeta}>
          {studio ? <span>{studio.toUpperCase()}</span> : null}
          {studio && slide.type ? <span className={styles.heroMetaDot} /> : null}
          {slide.type ? <span>{slide.type.toUpperCase()}</span> : null}
          {slide.episodes ? (
            <>
              <span className={styles.heroMetaDot} />
              <span>{slide.episodes} EP</span>
            </>
          ) : null}
        </div>

        {score !== null ? (
          <div className={styles.heroScoreRow}>
            <div className={styles.heroScoreBadge}>{formatFivePoint(score)}</div>
            <div className={styles.heroScoreMeta}>
              <div className={styles.heroScoreLabel}>{t('home.heroScoreLabel')}</div>
              <div className={styles.heroScoreSub}>
                {t('home.heroScoreSub', {
                  scored: scoredBy > 999 ? `${Math.round(scoredBy / 1000)}K` : scoredBy,
                  rank: popularity || '—',
                })}
              </div>
            </div>
          </div>
        ) : null}

        {slide.synopsis ? (
          <p className={`${styles.heroSynopsis} ${expanded ? styles.heroSynopsisOpen : ''}`}>
            {slide.synopsis}{' '}
            <button
              type="button"
              className={styles.heroSynopsisToggle}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? t('actions.showLess') : t('actions.readMore')}
            </button>
          </p>
        ) : null}

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.heroCtaPrimary}
            onClick={() => onOpenModal?.(normalizeAnime(slide), entry)}
          >
            <Plus size={14} strokeWidth={2.6} />
            {entry ? t('actions.editEntry') : t('actions.addToList')}
          </button>
          <Link href={`/anime/${slide.mal_id}`} className={styles.heroCtaSecondary}>
            {t('actions.viewDetails')}
          </Link>
        </div>

        <div className={styles.heroDots} role="tablist">
          {slides.map((s, i) => (
            <button
              key={s.mal_id}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={t('home.heroDotAria', { n: i + 1 })}
              className={`${styles.heroDot} ${i === idx ? styles.heroDotActive : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AiringStrip({ items, aniListMap, t }) {
  if (!items.length) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t('home.mobileAiringTitle')}</h2>
          <div className={styles.sectionSub}>
            {t('home.mobileAiringMeta', { n: items.length })}
          </div>
        </div>
        <Link href="/seasons" className={styles.sectionCta}>
          {t('actions.seeAll')}
        </Link>
      </div>
      <div className={styles.hScroll}>
        {items.map((item) => {
          const cover = getAnimeImageUrl(item, aniListMap?.[item.mal_id]);
          const score = typeof item.score === 'number' ? item.score : null;
          return (
            <Link
              key={item.mal_id}
              href={`/anime/${item.mal_id}`}
              className={styles.portraitCard}
            >
              <div className={styles.portraitPoster}>
                {cover ? (
                  <Image src={cover} alt="" fill sizes="124px" className={styles.portraitImg} />
                ) : null}
                {score !== null ? (
                  <span className={styles.portraitScore}>{formatFivePoint(score)}</span>
                ) : null}
                {item.type ? (
                  <span className={styles.portraitMeta}>
                    {item.type.toUpperCase()}
                    {item.episodes ? ` / ${item.episodes} EP` : ''}
                  </span>
                ) : null}
              </div>
              <div className={styles.portraitTitle}>{item.title}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HighlightsGrid({ items, aniListMap, t }) {
  if (!items.length) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>
            {t('home.mobileHighlightsTitle', {
              season: getSeasonFromDate()?.toUpperCase(),
              year: new Date().getFullYear(),
            })}
          </h2>
          <div className={styles.sectionSub}>
            {t('home.mobileHighlightsMeta', { n: items.length })}
          </div>
        </div>
        <Link href="/seasons" className={styles.sectionCta}>
          {t('actions.browseSeasons')}
        </Link>
      </div>
      <div className={styles.gridTwoCol}>
        {items.map((item) => {
          const cover = getAnimeImageUrl(item, aniListMap?.[item.mal_id]);
          const studio = primaryStudioName(item) || '';
          return (
            <Link key={item.mal_id} href={`/anime/${item.mal_id}`} className={styles.gridCard}>
              <div className={styles.gridPoster}>
                {cover ? (
                  <Image src={cover} alt="" fill sizes="(max-width: 768px) 45vw, 200px" />
                ) : null}
                {item.type ? (
                  <span className={styles.gridMeta}>
                    {item.type.toUpperCase()}
                    {item.episodes ? ` / ${item.episodes} EP` : ''}
                  </span>
                ) : null}
              </div>
              <div className={styles.gridTitle}>{item.title}</div>
              <div className={styles.gridSub}>
                {studio ? studio.toUpperCase() : ''}
                {studio && item.year ? ' · ' : ''}
                {item.year ? item.year : ''}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MobileHome({ heroSlides, airing, highlights, aniListMap, onOpenModal, getEntry, t }) {
  return (
    <div className={styles.mobileHome}>
      <HeroSection
        slides={heroSlides}
        aniListMap={aniListMap}
        onOpenModal={onOpenModal}
        getEntry={getEntry}
        t={t}
      />
      <AiringStrip items={airing} aniListMap={aniListMap} t={t} />
      <HighlightsGrid items={highlights} aniListMap={aniListMap} t={t} />
    </div>
  );
}

export default translate(MobileHome);
