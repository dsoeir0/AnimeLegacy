import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Plus, Check, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './index.module.css';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import RatingDisplay from '../components/ui/RatingDisplay';
import PosterCard from '../components/cards/PosterCard';
import AddToListModal from '../components/modals/AddToListModal';
import useMyList from '../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { getCurrentSeason, getTopAnimeMovies, slimAnimeResponse } from '../lib/services/jikan';
import { getSeasonFromDate } from '../lib/utils/season';
import { getAnimeBannerUrl } from '../lib/utils/media';
import { toCardShape } from '../lib/utils/cardShape';

function HeroCarousel({ slides, aniListMap, onOpenModal, getEntry, canEdit, t }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;
  const current = slides[idx];
  const media = aniListMap?.[current.mal_id];
  const card = toCardShape(current, media);
  const normalized = normalizeAnime(current);
  const entry = normalized ? getEntry(normalized.id) : null;

  return (
    <section className={styles.hero}>
      {slides.map((slide, i) => {
        const slideMedia = aniListMap?.[slide.mal_id];
        const slideBanner = getAnimeBannerUrl(slide, slideMedia) || slide?.images?.webp?.large_image_url || slide?.images?.jpg?.large_image_url;
        return (
          <div
            key={slide.mal_id}
            className={`${styles.heroSlide} ${i === idx ? styles.heroSlideActive : ''}`}
            aria-hidden={i !== idx}
          >
            {slideBanner ? (
              <Image src={slideBanner} alt="" fill priority={i === 0} sizes="100vw" className={styles.heroImage} />
            ) : null}
            <div className={styles.heroGradient} />
          </div>
        );
      })}

      <div className={styles.heroContent} key={current.mal_id}>
        <div className={styles.heroEyebrow}>
          {t('home.heroEyebrow', {
            season: getSeasonFromDate()?.toUpperCase(),
            year: new Date().getFullYear(),
          })}
        </div>
        <div className={styles.heroMetaTop}>
          {card.studio} · {card.year || '—'}{' '}
          {card.episodes ? `· ${t('home.heroEpisodesSuffix', { n: card.episodes })}` : ''}
        </div>
        <h1 className={styles.heroTitle}>{card.title}</h1>
        <p className={styles.heroSynopsis}>{card.synopsis || t('home.heroSynopsisFallback')}</p>
        <div className={styles.heroActions}>
          <Link href={`/anime/${current.mal_id}`} className={styles.heroLink}>
            <Button variant="primary" size="lg" icon={Play}>
              {t('actions.viewDetails')}
            </Button>
          </Link>
          {!canEdit ? (
            <Link href="/sign-in" className={styles.heroLink}>
              <Button variant="secondary" size="lg" icon={Plus}>
                {t('actions.loginToAdd')}
              </Button>
            </Link>
          ) : entry ? (
            <Button
              variant="collection"
              size="lg"
              icon={Check}
              onClick={() => onOpenModal(normalized, entry)}
            >
              {t('actions.inYourListProgress', {
                progress: entry.progress || 0,
                total: entry.episodesTotal || card.episodes || 0,
              })}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              icon={Plus}
              onClick={() => onOpenModal(normalized, null)}
            >
              {t('actions.addToList')}
            </Button>
          )}
          <div className={styles.heroMeta}>
            <RatingDisplay score={card.score} size="md" />
            <div className={styles.heroGenres}>
              {card.genres.slice(0, 3).map((g) => (
                <span key={g} className={styles.heroGenre}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.heroPagination}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`${styles.heroDot} ${i === idx ? styles.heroDotActive : ''}`}
            />
          ))}
          <span className={styles.heroCount}>
            {String(idx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </section>
  );
}

function ScrollRow({ title, eyebrow, cta, onCta, children, cardWidth = 200, t }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * (cardWidth + 16) * 3, behavior: 'smooth' });
  return (
    <section className={styles.row}>
      <div className={styles.rowHead}>
        <div>
          {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
          <h2 className={styles.rowTitle}>{title}</h2>
        </div>
        <div className={styles.rowControls}>
          {cta ? (
            <Button variant="plain" size="sm" iconRight={ArrowRight} onClick={onCta}>
              {cta}
            </Button>
          ) : null}
          <IconButton icon={ChevronLeft} tooltip={t('actions.scrollLeft')} onClick={() => scroll(-1)} />
          <IconButton icon={ChevronRight} tooltip={t('actions.scrollRight')} onClick={() => scroll(1)} />
        </div>
      </div>
      <div ref={ref} className={styles.rowTrack}>
        {children}
      </div>
    </section>
  );
}

function ContinueWatching({ entries, animeById, onEditEntry, t }) {
  const watching = entries.filter((e) => e.status === 'watching');
  if (!watching.length) return null;
  return (
    <section className={styles.continue}>
      <div className={styles.eyebrow} style={{ marginBottom: 6 }}>{t('home.continueEyebrow')}</div>
      <h2 className={styles.rowTitle}>{t('home.continueTitle')}</h2>
      <div className={styles.continueGrid}>
        {watching.slice(0, 6).map((e) => {
          const anime = animeById[e.id] || e;
          const total = e.episodesTotal || 0;
          const progress = e.progress || 0;
          const pct = total > 0 ? (progress / total) * 100 : 0;
          const next = progress + 1;
          return (
            <Link key={e.id} href={`/anime/${e.id}`} className={styles.continueCard}>
              <div className={styles.continuePoster}>
                <Image
                  src={anime.image || anime.posterUrl || '/logo_no_text.png'}
                  alt={anime.title}
                  fill
                  sizes="120px"

                />
                <div className={styles.continuePlay}>
                  <Play size={14} fill="#060709" stroke="#060709" />
                </div>
              </div>
              <div className={styles.continueBody}>
                <div>
                  <div className={styles.eyebrow} style={{ fontSize: 10, marginBottom: 3 }}>
                    {total > 0
                      ? t('home.continueNextUp', { n: Math.min(next, total) })
                      : t('home.continueOngoing')}
                  </div>
                  <div className={styles.continueTitle}>{anime.title}</div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <div className={styles.continueTrack}>
                    <div className={styles.continueFill} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={styles.continueProgress}>
                    <span>
                      {total > 0
                        ? t('home.continueEpisodes', { progress, total })
                        : t('home.continueEpisodesUnknown', { progress })}
                    </span>
                    <button
                      type="button"
                      className={styles.continueEdit}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        onEditEntry(e);
                      }}
                    >
                      {t('actions.edit')}
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function EditorialStrip({ t }) {
  const currentSeason = getSeasonFromDate()?.toUpperCase();
  const currentYear = new Date().getFullYear();
  return (
    <section className={styles.strip}>
      <div className={styles.stripCard}>
        <div>
          <div className={`${styles.eyebrow} ${styles.stripEyebrow}`}>
            {t('home.editorialEyebrow', { season: currentSeason, year: currentYear })}
          </div>
          <h2 className={styles.rowTitle}>{t('home.editorialTitle')}</h2>
          <p className={styles.stripText}>{t('home.editorialBody')}</p>
        </div>
        <Link href="/seasons">
          <Button variant="secondary" size="md" iconRight={ArrowRight}>
            {t('actions.browseSeasons')}
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Home({ currentResposta, moviesResposta, aniListMap, topMovies, t }) {
  const currentData = Array.isArray(currentResposta?.data) ? currentResposta.data : [];
  const currentSeason = getSeasonFromDate();
  const currentYear = new Date().getFullYear();
  const trendingData = currentData.filter((item) => {
    if (item?.type !== 'TV') return false;
    const matchesSeason = item?.season ? item.season === currentSeason : true;
    const matchesYear = item?.year ? item.year === currentYear : true;
    return matchesSeason && matchesYear;
  });
  const heroSlides = (trendingData.length >= 4 ? trendingData : currentData).slice(0, 5);
  const movieData = Array.isArray(moviesResposta?.data) ? moviesResposta.data : [];
  const moviePool = useMemo(() => {
    const scored = movieData.filter((item) => typeof item?.score === 'number' && item.score >= 7.5);
    return scored.length >= 3 ? scored : movieData;
  }, [movieData]);
  const [moviePicks, setMoviePicks] = useState(topMovies);

  const { list, addItem, isInList, getEntry, canEdit } = useMyList();
  const animeById = useMemo(() => {
    const map = {};
    list.forEach((e) => {
      if (e?.id) map[e.id] = e;
    });
    return map;
  }, [list]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const openAddModal = (anime, entry = null) => {
    if (!anime) return;
    setPendingAnime(anime);
    setPendingEntry(entry);
    setAddModalOpen(true);
  };
  const closeAddModal = () => {
    setAddModalOpen(false);
    setPendingAnime(null);
    setPendingEntry(null);
  };
  const handleConfirmAdd = async (details) => {
    if (!pendingAnime) return;
    await addItem(pendingAnime, details);
    closeAddModal();
  };

  const pickRandom = (items, count, excludeIds = new Set()) => {
    const pool = items.filter((item) => !excludeIds.has(item?.mal_id));
    const source = pool.length >= count ? pool : items;
    const shuffled = [...source];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  };
  const refreshMovies = () => {
    const currentIds = new Set(moviePicks.map((item) => item?.mal_id));
    setMoviePicks(pickRandom(moviePool, 6, currentIds));
  };

  return (
    <Layout title={t('home.metaTitle')} description={t('home.metaDesc')}>
      <div className={styles.main}>
        {heroSlides.length > 0 ? (
          <HeroCarousel
            slides={heroSlides}
            aniListMap={aniListMap}
            onOpenModal={openAddModal}
            getEntry={getEntry}
            canEdit={canEdit}
            t={t}
          />
        ) : null}

        <ContinueWatching
          entries={list}
          animeById={animeById}
          t={t}
          onEditEntry={(entry) => {
            const normalized = {
              id: entry.id,
              title: entry.title,
              image: entry.image,
              episodes: entry.episodesTotal,
              type: entry.type,
              season: entry.season,
              year: entry.year,
              genres: entry.genres || [],
              synopsis: entry.synopsis || '',
              malScore: entry.malScore,
              airing: entry.airing,
              aired: entry.aired,
            };
            openAddModal(normalized, entry);
          }}
        />

        <ScrollRow
          eyebrow={t('home.trendingEyebrow', {
            season: currentSeason?.toUpperCase(),
            year: currentYear,
          })}
          title={t('home.trendingTitle')}
          cta={t('actions.browseSeasons')}
          onCta={() => {}}
          t={t}
        >
          {trendingData.map((item) => (
            <div key={item.mal_id} style={{ flexShrink: 0 }}>
              <PosterCard
                anime={item}
                media={aniListMap?.[item.mal_id]}
                inList={isInList(item.mal_id)}
                href={`/anime/${item.mal_id}`}
                width={200}
              />
            </div>
          ))}
        </ScrollRow>

        <EditorialStrip t={t} />

        <ScrollRow
          eyebrow={t('home.curatedEyebrow')}
          title={t('home.filmsTitle')}
          cta={t('actions.shufflePicks')}
          onCta={refreshMovies}
          cardWidth={200}
          t={t}
        >
          {moviePicks.map((item) => (
            <div key={item.mal_id} style={{ flexShrink: 0 }}>
              <PosterCard
                anime={item}
                media={aniListMap?.[item.mal_id]}
                inList={isInList(item.mal_id)}
                href={`/anime/${item.mal_id}`}
                width={200}
              />
            </div>
          ))}
        </ScrollRow>

        <ScrollRow
          eyebrow={t('home.currentSeasonEyebrow')}
          title={t('home.seasonHighlights')}
          t={t}
        >
          {currentData.slice(0, 12).map((item) => (
            <div key={item.mal_id} style={{ flexShrink: 0 }}>
              <PosterCard
                anime={item}
                media={aniListMap?.[item.mal_id]}
                inList={isInList(item.mal_id)}
                href={`/anime/${item.mal_id}`}
                width={180}
              />
            </div>
          ))}
        </ScrollRow>
      </div>

      <AddToListModal
        open={addModalOpen}
        anime={pendingAnime}
        onClose={closeAddModal}
        onConfirm={handleConfirmAdd}
        initialStatus={pendingEntry?.status}
        initialProgress={pendingEntry?.progress}
        initialFavorite={pendingEntry?.isFavorite}
        initialRating={pendingEntry?.rating}
        initialReview={pendingEntry?.review}
        favoriteCount={list.filter((e) => e.isFavorite).length}
        isEditing={Boolean(pendingEntry)}
      />
    </Layout>
  );
}

export default translate(Home);

export async function getServerSideProps() {
  try {
    const [currentRespostaRaw, moviesRespostaRaw] = await Promise.all([
      getCurrentSeason(),
      getTopAnimeMovies(),
    ]);
    const currentFiltered = Array.isArray(currentRespostaRaw?.data)
      ? filterOutHentai(currentRespostaRaw.data)
      : [];
    const currentResposta = slimAnimeResponse({ data: currentFiltered });
    const moviesFiltered = Array.isArray(moviesRespostaRaw?.data)
      ? filterOutHentai(moviesRespostaRaw.data)
      : [];
    const moviesResposta = slimAnimeResponse({ data: moviesFiltered });

    const pickRandom = (items, count) => {
      const pool = [...items];
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, count);
    };
    const topMovies = pickRandom(
      moviesResposta.data.filter((item) => typeof item?.score === 'number' && item.score >= 7.5),
      6,
    );

    const ids = [
      ...currentResposta.data.slice(0, 40).map((item) => item.mal_id),
      ...moviesResposta.data.slice(0, 20).map((item) => item.mal_id),
    ].filter(Boolean);
    const aniListMap = await fetchAniListMediaByMalIds(ids);

    return { props: { currentResposta, moviesResposta, aniListMap, topMovies } };
  } catch {
    return {
      props: {
        currentResposta: { data: [] },
        moviesResposta: { data: [] },
        aniListMap: {},
        topMovies: [],
      },
    };
  }
}
