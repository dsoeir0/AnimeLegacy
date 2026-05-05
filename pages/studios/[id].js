import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { translate, getLanguage } from 'react-switch-lang';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import RatingDisplay from '../../components/ui/RatingDisplay';
import useTranslatedText from '../../hooks/useTranslatedText';
import { getAnimeByProducer, getProducerById, getProducers } from '../../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../../lib/utils/anime';
import { getAnimeBannerUrl, getAnimeThumbUrl } from '../../lib/utils/media';
import {
  classifyProducerRole,
  pickStudioName,
  studioInitial,
  studioInitials,
} from '../../lib/utils/studio';
import { accentForStudio } from '../../lib/utils/studioAccent';
import {
  avgScore,
  countAiring,
  groupByYear,
  scoreHighlights,
  scoreHistogram,
  topGenres,
  upcomingAnime,
} from '../../lib/utils/studioStats';
import styles from './[id].module.css';

const CURRENT_YEAR = new Date().getFullYear();

const FILTER_ALL = 'all';
const FILTER_TV = 'tv';
const FILTER_MOVIE = 'movie';

const matchesFormat = (anime, filter) => {
  if (filter === FILTER_ALL) return true;
  const type = String(anime?.type || '').toLowerCase();
  if (filter === FILTER_TV) return type === 'tv' || type.includes('tv');
  if (filter === FILTER_MOVIE) return type === 'movie' || type.includes('movie');
  return true;
};

function StudioDetailPage({ producer, works, related, t }) {
  const currentLang = typeof getLanguage === 'function' ? getLanguage() : 'en';
  const { text: translatedAbout } = useTranslatedText({
    docId: producer?.mal_id,
    sourceText: producer?.about || '',
    lang: currentLang,
    cacheField: 'aboutByLang',
    cacheCollection: 'studios',
  });

  const [formatFilter, setFormatFilter] = useState(FILTER_ALL);

  const filteredWorks = useMemo(
    () => works.filter((w) => matchesFormat(w, formatFilter)),
    [works, formatFilter],
  );
  const groupedWorks = useMemo(() => groupByYear(filteredWorks), [filteredWorks]);

  // Aggregates are cheap — computed on each render rather than memoised.
  // Studios rarely have more than ~24 anime in the fetched window.
  const mean = avgScore(works);
  const airing = countAiring(works);
  const upcoming = upcomingAnime(works).slice(0, 3);
  const histogram = scoreHistogram(works);
  const highlights = scoreHighlights(works);
  const genres = topGenres(works, 8);

  const accent = producer ? accentForStudio(producer.mal_id) : null;
  const heroPoster = works[0] ? getAnimeBannerUrl(works[0]) : null;

  if (!producer) {
    return (
      <Layout title="AnimeLegacy · Studio">
        <div className={styles.page}>
          <div className={styles.empty}>
            <h1>{t('errors.notFound')}</h1>
            <p>{t('studio.notFoundBody')}</p>
            <Link href="/studios">
              <Button variant="primary" size="md">{t('actions.backToStudios')}</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const name = pickStudioName(producer);
  const aboutSource = translatedAbout || producer.about || '';
  const bioSingle = aboutSource.replace(/\s+/g, ' ').trim();
  const established = producer.established
    ? new Date(producer.established).getFullYear()
    : null;
  const yearsActive = established && CURRENT_YEAR - established > 0
    ? CURRENT_YEAR - established
    : null;
  const officialUrl = Array.isArray(producer.external) && producer.external[0]?.url;

  const histMax = Math.max(1, ...histogram);

  return (
    <Layout
      title={`${name} · AnimeLegacy`}
      description={t('studio.metaDescFallback', { name })}
    >
      <div className={styles.page}>
        {/* ───── Hero ───── */}
        <section className={styles.hero}>
          {heroPoster ? (
            <Image
              src={heroPoster}
              alt=""
              fill
              sizes="100vw"
              quality={85}
              priority
              className={styles.heroImage}
            />
          ) : null}
          <div
            className={styles.heroGradient}
            style={{
              background: `linear-gradient(180deg, rgba(6,7,9,0.3) 0%, rgba(6,7,9,0.75) 55%, var(--al-ink-1) 100%), linear-gradient(90deg, ${accent.base}25, transparent 60%)`,
            }}
          />

          <div className={styles.crumbs}>
            <Link href="/studios" className={styles.crumbBtn}>
              <ArrowLeft size={12} aria-hidden="true" />
              <span>{t('studioPage.breadcrumbStudios')}</span>
            </Link>
            <span className={styles.crumbSep}>/</span>
            <span className={styles.crumbActive}>{name}</span>
          </div>

          <div className={styles.heroContent}>
            <div
              className={styles.heroLogo}
              style={{
                background: accent.base,
                boxShadow: `0 20px 60px ${accent.base}55, 0 0 0 1px rgba(255,255,255,0.08) inset`,
              }}
            >
              {studioInitial(name)}
            </div>
            <div className={styles.heroTextBlock}>
              <div className={styles.heroEyebrow} style={{ color: accent.ink }}>
                {established
                  ? t('studioPage.hero.eyebrow', { year: established })
                  : t('studioPage.hero.eyebrowNoYear')}
              </div>
              <h1 className={styles.heroTitle}>{name}</h1>
              {bioSingle ? (
                <p className={styles.heroBio}>{bioSingle}</p>
              ) : null}
            </div>
            {officialUrl ? (
              <div className={styles.heroActions}>
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.heroLink}
                >
                  <Button variant="primary" size="md" iconRight={ExternalLink}>
                    {t('studioPage.hero.officialSite')}
                  </Button>
                </a>
              </div>
            ) : null}
          </div>
        </section>

        {/* ───── KPI strip ───── */}
        <section className={styles.kpiStrip}>
          <Kpi label={t('studioPage.kpi.yearsActive')} value={yearsActive ?? '—'} unit={t('studioPage.kpi.yearsUnit')} />
          <Kpi label={t('studioPage.kpi.productions')} value={producer.count || 0} unit={t('studioPage.kpi.productionsUnit')} />
          <Kpi
            label={t('studioPage.kpi.avgScore')}
            value={mean !== null ? mean.toFixed(2) : '—'}
            unit={t('studioPage.kpi.avgScoreUnit')}
            color="var(--al-warm-ink)"
          />
          <Kpi
            label={t('studioPage.kpi.airing')}
            value={airing}
            unit={t('studioPage.kpi.airingUnit')}
          />
          <Kpi
            label={t('studioPage.kpi.best')}
            value={highlights.best !== null ? highlights.best.toFixed(2) : '—'}
            unit={t('studioPage.kpi.bestUnit')}
            color={accent.ink}
          />
        </section>

        {/* ───── Two columns ───── */}
        <section className={styles.cols}>
          {/* LEFT — filmography timeline */}
          <div>
            <header className={styles.colHead}>
              <div>
                <div className={styles.sectionEyebrow}>
                  {t('studioPage.timeline.eyebrow')}
                </div>
                <h2 className={styles.sectionTitle}>
                  {t('studioPage.timeline.heading')}
                </h2>
              </div>
              <div className={styles.formatFilters}>
                {[
                  { id: FILTER_ALL, label: t('studioPage.timeline.all') },
                  { id: FILTER_TV, label: t('studioPage.timeline.tv') },
                  { id: FILTER_MOVIE, label: t('studioPage.timeline.movie') },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`${styles.formatBtn} ${formatFilter === f.id ? styles.formatBtnActive : ''}`}
                    onClick={() => setFormatFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </header>

            {filteredWorks.length === 0 ? (
              <p className={styles.emptyBody}>{t('studioPage.timeline.empty')}</p>
            ) : (
              <div
                className={styles.timeline}
                style={{
                  '--studio-accent': accent.base,
                }}
              >
                {groupedWorks.map((group, groupIdx) => (
                  <div key={group.year ?? 'unknown'} className={styles.yearGroup}>
                    <div className={styles.yearLabel}>
                      {group.year ?? t('studioPage.timeline.yearUnknown')}
                    </div>
                    {group.anime.map((a, i) => {
                      const isTopHit = groupIdx === 0 && i === 0;
                      return (
                        <Link
                          key={a.mal_id}
                          href={`/anime/${a.mal_id}`}
                          className={styles.timelineRow}
                        >
                          <div
                            className={styles.timelineDot}
                            style={{
                              background: isTopHit ? accent.base : 'var(--al-ink-3)',
                              borderColor: isTopHit ? accent.base : 'var(--al-border-strong)',
                              boxShadow: isTopHit
                                ? `0 0 0 4px ${accent.base}22`
                                : 'none',
                            }}
                          />
                          <div className={styles.timelinePoster}>
                            {getAnimeThumbUrl(a) ? (
                              <Image
                                src={getAnimeThumbUrl(a)}
                                alt=""
                                fill
                                sizes="110px"
                                className={styles.timelinePosterImg}
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                          <div className={styles.timelineBody}>
                            <div className={styles.timelineChips}>
                              <span
                                className={styles.chipYear}
                                style={{ color: accent.ink }}
                              >
                                {a.year ?? a?.aired?.prop?.from?.year ?? '—'}
                              </span>
                              <span className={styles.chipNeutral}>
                                {a.type || 'TV'}
                              </span>
                              <span className={styles.chipNeutral}>
                                {t('studioPage.timeline.epShort', {
                                  n: a.episodes || '?',
                                })}
                              </span>
                            </div>
                            <h3 className={styles.timelineTitle}>
                              {a.title || 'Untitled'}
                            </h3>
                            {a.synopsis ? (
                              <p className={styles.timelineSynopsis}>
                                {a.synopsis}
                              </p>
                            ) : null}
                            {Array.isArray(a.genres) && a.genres.length ? (
                              <div className={styles.timelineGenres}>
                                {a.genres.slice(0, 3).map((g) => (
                                  <span key={g?.mal_id || g?.name} className={styles.genreChip}>
                                    {g?.name || g}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className={styles.timelineScore}>
                            {typeof a.score === 'number' ? (
                              <RatingDisplay score={a.score} size="sm" />
                            ) : (
                              <div className={styles.noScore}>—</div>
                            )}
                            <div className={styles.scoreEyebrow}>
                              {t('studioPage.timeline.scoreEyebrow')}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — signature genres + score distribution */}
          <aside className={styles.side}>
            {genres.length ? (
              <div className={styles.sideBlock}>
                <div className={styles.sectionEyebrow}>
                  {t('studioPage.signature.eyebrow')}
                </div>
                <h3 className={styles.sideTitle}>
                  {t('studioPage.signature.heading')}
                </h3>
                <p className={styles.sideHint}>
                  {t('studioPage.signature.hint', { name })}
                </p>
                <div className={styles.genreCloud}>
                  {genres.map((g) => (
                    <span key={g.name} className={styles.genreCloudChip}>
                      {g.name}
                      <span className={styles.genreCloudCount}>{g.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {highlights.best !== null ? (
              <div
                className={styles.distCard}
                style={{ '--studio-accent': accent.base }}
              >
                <div className={styles.sectionEyebrow}>
                  {t('studioPage.distribution.eyebrow')}
                </div>
                <div className={styles.histogram}>
                  {histogram.map((count, i) => (
                    <div key={i} className={styles.histColumn}>
                      <div
                        className={styles.histBar}
                        style={{
                          height: `${(count / histMax) * 100}%`,
                          background:
                            i >= 7 ? accent.base : 'var(--al-ink-4)',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.histAxis}>
                  <span>0</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                  <span>8</span>
                  <span>10</span>
                </div>
                <div className={styles.distFooter}>
                  <div>
                    <div className={styles.distLabel}>
                      {t('studioPage.distribution.median')}
                    </div>
                    <div className={styles.distValue}>
                      {highlights.median !== null
                        ? highlights.median.toFixed(2)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className={styles.distLabel}>
                      {t('studioPage.distribution.above8')}
                    </div>
                    <div
                      className={styles.distValue}
                      style={{ color: accent.ink }}
                    >
                      {highlights.percentAbove8 !== null
                        ? `${highlights.percentAbove8}%`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className={styles.distLabel}>
                      {t('studioPage.distribution.best')}
                    </div>
                    <div
                      className={styles.distValue}
                      style={{ color: 'var(--al-warm-ink)' }}
                    >
                      {highlights.best !== null
                        ? highlights.best.toFixed(2)
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </section>

        {/* ───── Upcoming ───── */}
        {upcoming.length ? (
          <section className={styles.upcoming}>
            <header className={styles.colHead}>
              <div>
                <div
                  className={styles.sectionEyebrow}
                  style={{ color: accent.ink }}
                >
                  {t('studioPage.upcoming.eyebrow')}
                </div>
                <h2 className={styles.sectionTitle}>
                  {t('studioPage.upcoming.heading')}
                </h2>
              </div>
            </header>
            <div className={styles.upcomingGrid}>
              {upcoming.map((a) => (
                <Link
                  key={a.mal_id}
                  href={`/anime/${a.mal_id}`}
                  className={styles.upcomingCard}
                  style={{
                    background: `linear-gradient(135deg, ${accent.base}10, transparent 60%), var(--al-ink-2)`,
                    borderLeft: `3px solid ${accent.base}`,
                  }}
                >
                  <div className={styles.upcomingHead}>
                    <span
                      className={styles.upcomingStatus}
                      style={{
                        background: `${accent.base}18`,
                        borderColor: `${accent.base}44`,
                        color: accent.ink,
                      }}
                    >
                      {t('studioPage.upcoming.status')}
                    </span>
                    <span className={styles.upcomingYear}>
                      {a.year ?? a?.aired?.prop?.from?.year ?? 'TBA'}
                    </span>
                  </div>
                  <h3 className={styles.upcomingTitle}>
                    {a.title || 'Untitled'}
                  </h3>
                  <div className={styles.upcomingType}>
                    {a.type || 'Series'}
                    {a.episodes ? ` · ${t('studioPage.timeline.epShort', { n: a.episodes })}` : ''}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* ───── Related studios ───── */}
        {related.length ? (
          <section className={styles.related}>
            <header className={styles.colHead}>
              <div>
                <div className={styles.sectionEyebrow}>
                  {t('studioPage.related.eyebrow')}
                </div>
                <h2 className={styles.sectionTitle}>
                  {t('studioPage.related.heading')}
                </h2>
              </div>
            </header>
            <div className={styles.relatedGrid}>
              {related.map((s) => {
                const relAccent = accentForStudio(s.mal_id);
                const relName = pickStudioName(s);
                return (
                  <Link
                    key={s.mal_id}
                    href={`/studios/${s.mal_id}`}
                    className={styles.relatedCard}
                  >
                    <div
                      className={styles.relatedLogo}
                      style={{
                        background: `${relAccent.base}22`,
                        border: `1px solid ${relAccent.base}55`,
                        color: relAccent.ink,
                      }}
                    >
                      {studioInitials(relName)}
                    </div>
                    <div className={styles.relatedBody}>
                      <div className={styles.relatedName}>{relName}</div>
                      <div className={styles.relatedMeta}>
                        {t('studioPage.related.works', { n: s.count || 0 })}
                      </div>
                    </div>
                    <ChevronRight size={14} className={styles.relatedChev} />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}

function Kpi({ label, value, unit, color }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiRow}>
        <div className={styles.kpiValue} style={color ? { color } : undefined}>
          {value}
        </div>
        {unit ? <div className={styles.kpiUnit}>{unit}</div> : null}
      </div>
    </div>
  );
}

export default translate(StudioDetailPage);

export async function getServerSideProps(context) {
  const { id } = context.query;
  const producerId = Number(id);

  // Kick off the main two fetches in parallel, plus the "related" page for
  // the sidebar block at the bottom. Jikan caches at the TTL layer, so a
  // page 1 list is usually instant on repeat views.
  const [producerRes, worksRes, relatedRes] = await Promise.all([
    getProducerById(id),
    getAnimeByProducer(id),
    getProducers(1),
  ]);

  const rawWorks = Array.isArray(worksRes?.data)
    ? dedupeByMalId(filterOutHentai(worksRes.data))
    : [];

  // Role filter: only include anime where THIS producer is in the
  // `studios[]` list. Without this, a studio's catalogue page shows
  // everything they licensed or co-produced, not just what they animated.
  const { matches: roleMatches } = classifyProducerRole(rawWorks, producerId);
  const works = roleMatches.length ? roleMatches : rawWorks;

  // Related = top-favourited producers, excluding this one, capped at 4.
  const relatedCandidates = Array.isArray(relatedRes?.data) ? relatedRes.data : [];
  const related = relatedCandidates
    .filter((s) => Number(s?.mal_id) !== producerId)
    .slice(0, 4);

  return {
    props: {
      producer: producerRes?.data || null,
      works,
      related,
    },
  };
}
