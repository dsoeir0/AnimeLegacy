import Link from 'next/link';
import Image from 'next/image';
import Layout from '../components/layout/Layout';
import styles from '../styles/movies.module.css';
import useMyList from '../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { getTopAnimeMovies } from '../lib/services/jikan';
import { getAnimeImageUrl } from '../lib/utils/media';

export default function Movies({ moviesResposta, aniListMap }) {
  const movieData = Array.isArray(moviesResposta?.data) ? moviesResposta.data : [];
  const { addItem, removeItem, isInList, canEdit } = useMyList();

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - Movies"
      description="Cinematic anime films curated for your next watch night."
    >
      <main className={styles.main}>
        <section className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Movies</div>
            <h1 className={styles.title}>Cinematic anime, curated</h1>
            <p className={styles.subtitle}>
              The most celebrated anime films, from timeless classics to recent masterpieces.
            </p>
          </div>
        </section>
        <section className={styles.grid}>
          {movieData.map((movie, index) => {
            const media = aniListMap?.[movie.mal_id];
            const imageUrl = getAnimeImageUrl(movie, media);
            const normalized = normalizeAnime(movie);
            return (
              <div
                key={movie.mal_id}
                className={styles.card}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Link href={`/anime/${movie.mal_id}`} legacyBehavior>
                  <a className={styles.cardLink}>
                    <div className={styles.poster}>
                      <Image
                        className={styles.posterImage}
                        src={imageUrl || '/logo_no_text.png'}
                        alt={movie.title}
                        fill
                        sizes="220px"
                      />
                      <span className={styles.score}>{movie.score || 'NR'}</span>
                    </div>
                    <div className={styles.info}>
                      <div className={styles.cardTitle}>{movie.title}</div>
                      <div className={styles.meta}>
                        <span>{movie.year || movie.aired?.prop?.from?.year || '-'}</span>
                        <span>{movie.duration || 'Movie'}</span>
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
        </section>
      </main>
    </Layout>
  );
}

export async function getServerSideProps() {
  const moviesResposta = await getTopAnimeMovies();
  const filtered = Array.isArray(moviesResposta?.data) ? filterOutHentai(moviesResposta.data) : [];
  moviesResposta.data = filtered;
  const ids = filtered.map((item) => item.mal_id);
  const aniListMap = await fetchAniListMediaByMalIds(ids);

  return { props: { moviesResposta, aniListMap } };
}
