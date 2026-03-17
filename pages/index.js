import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import Layout from '../components/layout/Layout';
import useMyList from '../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { getCurrentSeason, getTopAnimeMovies, slimAnimeResponse } from '../lib/services/jikan';
import { getSeasonFromDate } from '../lib/utils/season';
import { getAnimeBannerUrl, getAnimeImageUrl } from '../lib/utils/media';

export default function Home({ currentResposta, moviesResposta, aniListMap, topMovies }) {
  const currentData = Array.isArray(currentResposta?.data) ? currentResposta.data : [];
  const currentSeason = getSeasonFromDate();
  const currentYear = new Date().getFullYear();
  const heroData = currentData.slice(0, 5);
  const trendingData = Array.isArray(currentResposta?.data)
    ? currentResposta.data.filter((item) => {
        if (item?.type !== 'TV') return false;
        const matchesSeason = item?.season ? item.season === currentSeason : true;
        const matchesYear = item?.year ? item.year === currentYear : true;
        return matchesSeason && matchesYear;
      })
    : [];
  const movieData = Array.isArray(moviesResposta?.data) ? moviesResposta.data : [];
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featured =
    heroData[featuredIndex] || heroData[0] || trendingData[0] || movieData[0] || null;
  const featuredMedia = featured ? aniListMap?.[featured.mal_id] : null;
  const featuredImage = featured ? getAnimeBannerUrl(featured, featuredMedia) : '';
  const featuredNormalized = featured ? normalizeAnime(featured) : null;
  const trendingRef = useRef(null);
  const { addItem, removeItem, isInList, canEdit } = useMyList();
  const slideDuration = 6;

  useEffect(() => {
    if (heroData.length <= 1) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % heroData.length);
    }, slideDuration * 1000);
    return () => clearInterval(interval);
  }, [heroData.length]);

  const handleScroll = (direction) => {
    if (!trendingRef.current) return;
    const container = trendingRef.current;
    const step = direction === 'left' ? -1 : 1;
    const cardWidth = 220;
    const gap = 24;
    const delta = (cardWidth + gap) * 3 * step;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - Seasonal Highlights"
      description="Discover curated seasonal anime, trending series, and top movies in one place."
    >
      <main className={styles.main}>
        <section className={`${styles.heroSection} ${styles.heroSectionFull}`}>
          <div className={styles.heroBackdrop}>
            {featuredImage ? (
              <Image
                key={`hero-image-${featured?.mal_id || featuredIndex}`}
                className={styles.heroBackdropImage}
                src={featuredImage}
                alt={featured?.title || 'Featured background'}
                fill
                sizes="100vw"
                priority
              />
            ) : null}
          </div>
          <div className={styles.heroOverlay} />
          <div
            key={`hero-content-${featured?.mal_id || featuredIndex}`}
            className={styles.heroContent}
          >
            <div className={styles.heroBadge}>Featured This Season</div>
            <h1 className={styles.heroTitle}>{featured?.title || 'Discover New Worlds'}</h1>
            <p className={styles.heroDescription}>
              {featured?.synopsis ||
                'Curated picks from this season and beyond. Dive into epic adventures, heartfelt stories, and unforgettable worlds.'}
            </p>
            <div className={styles.heroActions}>
              {featured ? (
                <Link href={`/anime/${featured.mal_id}`} legacyBehavior>
                  <a className={`${styles.button} ${styles.primaryButton}`}>View Details</a>
                </Link>
              ) : null}
              {featured ? (
                <button
                  className={`${styles.button} ${styles.ghostButton}`}
                  type="button"
                  onClick={() => {
                    if (!featuredNormalized) return;
                    if (!canEdit) return;
                    if (isInList(featuredNormalized.id)) {
                      removeItem(featuredNormalized.id);
                    } else {
                      addItem(featuredNormalized);
                    }
                  }}
                  disabled={!canEdit}
                >
                  {!canEdit
                    ? 'Login to Add'
                    : featuredNormalized && isInList(featuredNormalized.id)
                      ? 'Remove from List'
                      : 'Add to List'}
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.heroPosterSpacer} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>Current Season</div>
              <h2 className={styles.sectionTitle}>This season&apos;s TV lineup</h2>
            </div>
            <Link href={`/seasons/${currentYear}`} legacyBehavior>
              <a className={styles.sectionLink}>See all</a>
            </Link>
          </div>
          <div className={styles.carouselWrapper}>
            <button
              className={styles.carouselButton}
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Scroll left"
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <div className={styles.cardRow} ref={trendingRef} style={{ '--card-width': '220px' }}>
              <div className={styles.carouselSpacer} aria-hidden="true" />
              {trendingData.map((element, index) => {
                const media = aniListMap?.[element.mal_id];
                const imageUrl = getAnimeImageUrl(element, media);
                const normalized = normalizeAnime(element);
                return (
                  <div
                    key={element.mal_id}
                    className={styles.trendingCard}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                      <a className={styles.trendingLink}>
                        <div className={styles.trendingPoster}>
                          <Image
                            className={styles.trendingImage}
                            src={imageUrl || '/logo_no_text.png'}
                            alt={element.title}
                            fill
                            sizes="220px"
                            priority={index < 6}
                          />
                          <span className={styles.ratingBadge}>{element.score || 'NR'}</span>
                        </div>
                        <div className={styles.trendingMeta}>
                          <div className={styles.trendingTitle}>{element.title}</div>
                          <div className={styles.trendingTags}>
                            {element.type || 'Series'} -{' '}
                            {element.episodes ? `${element.episodes} eps` : 'Ongoing'}
                          </div>
                        </div>
                      </a>
                    </Link>
                    <button
                      className={styles.listButton}
                      type="button"
                      onClick={() => {
                        if (!normalized) return;
                        if (!canEdit) return;
                        if (isInList(normalized.id)) {
                          removeItem(normalized.id);
                        } else {
                          addItem(normalized);
                        }
                      }}
                      disabled={!canEdit}
                    >
                      {!canEdit
                        ? 'Login to Add'
                        : normalized && isInList(normalized.id)
                          ? 'In My List'
                          : 'Add to List'}
                    </button>
                  </div>
                );
              })}
              <div className={styles.carouselSpacer} aria-hidden="true" />
            </div>
            <button
              className={styles.carouselButton}
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Scroll right"
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>Recommended</div>
              <h2 className={styles.sectionTitle}>Recommended movies to watch tonight</h2>
            </div>
            <Link href="/movies" legacyBehavior>
              <a className={styles.sectionLink}>See all</a>
            </Link>
          </div>
          <div className={styles.movieGrid}>
            {topMovies.map((element, index) => {
              const media = aniListMap?.[element.mal_id];
              const imageUrl = getAnimeImageUrl(element, media);
              const normalized = normalizeAnime(element);
              return (
                <div
                  key={element.mal_id}
                  className={styles.movieCard}
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                    <a className={styles.movieLink}>
                      <div className={styles.moviePoster}>
                        <Image
                          className={styles.moviePosterImage}
                          src={imageUrl || '/logo_no_text.png'}
                          alt={element.title}
                          fill
                          sizes="120px"
                        />
                      </div>
                      <div className={styles.movieInfo}>
                        <div className={styles.movieTitle}>{element.title}</div>
                        <p className={styles.movieDescription}>
                          {element.synopsis ||
                            'A visual masterpiece that blends emotion, artistry, and unforgettable storytelling.'}
                        </p>
                        <div className={styles.movieMeta}>
                          <span>{element.type || 'Movie'}</span>
                          <span>{element.year || element.aired?.prop?.from?.year || '-'}</span>
                          <span>{element.score ? `${element.score}` : 'NR'}</span>
                        </div>
                      </div>
                    </a>
                  </Link>
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => {
                      if (!normalized) return;
                      if (!canEdit) return;
                      if (isInList(normalized.id)) {
                        removeItem(normalized.id);
                      } else {
                        addItem(normalized);
                      }
                    }}
                    disabled={!canEdit}
                  >
                    {!canEdit
                      ? 'Login to Add'
                      : normalized && isInList(normalized.id)
                        ? 'In My List'
                        : 'Add to List'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </Layout>
  );
}

export async function getServerSideProps() {
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
    3,
  );

  const ids = [
    ...currentResposta.data.slice(0, 40).map((item) => item.mal_id),
    ...moviesResposta.data.slice(0, 10).map((item) => item.mal_id),
  ].filter(Boolean);
  const aniListMap = await fetchAniListMediaByMalIds(ids);

  return { props: { currentResposta, moviesResposta, aniListMap, topMovies } };
}
