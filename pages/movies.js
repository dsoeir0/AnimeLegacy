import Link from 'next/link'
import Layout from '../components/Layout'
import styles from '../styles/movies.module.css'
import Image from 'next/image'
import useMyList from '../components/useMyList'
import { normalizeAnime } from '../lib/anime'
import { fetchAniListMediaByMalIds } from '../lib/anilist'

export default function Movies({ moviesResposta, aniListMap }) {
  const movieData = Array.isArray(moviesResposta?.data) ? moviesResposta.data : []
  const { addItem, removeItem, isInList } = useMyList()

  return (
    <Layout showSidebar={false} headerVariant="dark" layoutVariant="dark">
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
            const media = aniListMap?.[movie.mal_id]
            const imageUrl =
              media?.coverImage?.extraLarge ||
              media?.coverImage?.large ||
              movie?.images?.webp?.large_image_url ||
              movie?.images?.jpg?.large_image_url ||
              movie?.images?.jpg?.image_url ||
              ''
            const normalized = normalizeAnime(movie)
            return (
              <div key={movie.mal_id} className={styles.card} style={{ animationDelay: `${index * 60}ms` }}>
                <Link href={`/anime/${movie.mal_id}`} legacyBehavior>
                  <a className={styles.cardLink}>
                    <div className={styles.poster}>
                      <Image
                        className={styles.posterImage}
                        src={imageUrl || '/vercel.svg'}
                        alt={movie.title}
                        fill
                        sizes="220px"
                      />
                      <span className={styles.score}>{movie.score || 'NR'}</span>
                    </div>
                    <div className={styles.info}>
                      <div className={styles.cardTitle}>{movie.title}</div>
                      <div className={styles.meta}>
                        <span>{movie.year || movie.aired?.prop?.from?.year || '—'}</span>
                        <span>{movie.duration || 'Movie'}</span>
                      </div>
                    </div>
                  </a>
                </Link>
                <button
                  className={styles.listButton}
                  type="button"
                  onClick={() => {
                    if (!normalized) return
                    if (isInList(normalized.id)) {
                      removeItem(normalized.id)
                    } else {
                      addItem(normalized)
                    }
                  }}
                >
                  {normalized && isInList(normalized.id) ? 'In My List' : 'Add to List'}
                </button>
              </div>
            )
          })}
        </section>
      </main>
    </Layout>
  )
}

export async function getServerSideProps() {
  const baseurl = "https://api.jikan.moe/v4/";
  const movies = await fetch(`${baseurl}top/anime?type=movie`)
  const moviesResposta = await movies.json()

  const ids = moviesResposta?.data?.map((item) => item.mal_id) || []
  const aniListMap = await fetchAniListMediaByMalIds(ids)

  return { props: { moviesResposta, aniListMap } }
}
