import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '../components/layout/Layout';
import AddToListModal from '../components/modals/AddToListModal';
import styles from './movies.module.css';
import useMyList from '../hooks/useMyList';
import { filterOutHentai, normalizeAnime } from '../lib/utils/anime';
import { fetchAniListMediaByMalIds } from '../lib/services/anilist';
import { getTopAnimeMovies } from '../lib/services/jikan';
import { getAnimeImageUrl } from '../lib/utils/media';

export default function Movies({ moviesResposta, aniListMap }) {
  const movieData = Array.isArray(moviesResposta?.data) ? moviesResposta.data : [];
  const { addItem, isInList, getEntry, canEdit, favoritesCount } = useMyList();
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
                {!canEdit ? (
                  <button className={styles.listButton} type="button" disabled>
                    Login to Add
                  </button>
                ) : normalized && isInList(normalized.id) ? (
                  <div className={styles.listActions}>
                    <Link href="/my-list" legacyBehavior>
                      <a className={`${styles.listButton} ${styles.listLink}`}>In My List</a>
                    </Link>
                    <button
                      className={`${styles.listButton} ${styles.editButton}`}
                      type="button"
                      onClick={() => openAddModal(normalized, getEntry(normalized.id))}
                    >
                      <i className={`bi bi-pencil ${styles.editIcon}`} aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => openAddModal(normalized)}
                  >
                    Add to List
                  </button>
                )}
              </div>
            );
          })}
        </section>
      </main>
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
        favoriteCount={favoritesCount}
        isEditing={Boolean(pendingEntry)}
      />
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
