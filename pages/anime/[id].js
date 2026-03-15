import React from 'react'
import Image from 'next/image'
import styles from '../../styles/anime.module.css'
import Layout from '../../components/Layout'

export default function anime({ animeResposta, charactersResposta }) {
  const data = animeResposta?.data ?? {}
  const genres = Array.isArray(data.genres) ? data.genres : []
  const producers = Array.isArray(data.producers) ? data.producers : []
  const posterUrl = data?.images?.webp?.large_image_url
    || data?.images?.jpg?.large_image_url
    || data?.images?.webp?.image_url
    || data?.images?.jpg?.image_url
    || ''
  const backdropUrl = data?.images?.webp?.large_image_url
    || data?.images?.jpg?.large_image_url
    || posterUrl
  const trailerUrl = data?.trailer?.embed_url || ''
  const seasonLabel = data?.season
    ? `${data.season[0].toUpperCase()}${data.season.slice(1)} ${data?.year || ''}`.trim()
    : (data?.year ? `${data.year}` : 'Unknown')
  const studioName = Array.isArray(data.studios) && data.studios.length > 0 ? data.studios[0].name : 'Unknown'
  const ratingLabel = data?.rating || 'Not Rated'
  const scoreLabel = typeof data?.score === 'number' ? data.score.toFixed(2) : 'N/A'
  const isAiring = Boolean(data?.airing)
  const characters = Array.isArray(charactersResposta?.data) ? charactersResposta.data : []
  const rankLabel = data?.rank ? `#${data.rank}` : 'N/A'
  const popularityLabel = data?.popularity ? `#${data.popularity}` : 'N/A'
  const episodeLabel = data?.episodes ? `${data.episodes} (${data?.duration || '23 min'})` : 'TBA'
  const synopsisText = data.synopsis || 'Synopsis not available.'
  const [shortSynopsis, ...restSynopsis] = synopsisText.split('. ')
  const secondarySynopsis = restSynopsis.join('. ').trim()
  const backgroundText = data?.background || 'Background information not available.'

  return (
    <Layout showSidebar={false} headerVariant="dark" layoutVariant="dark">
      <title>{data.title || 'Anime'}</title>
      <div className={styles.page}>
        <section className={styles.hero}>
          {backdropUrl ? (
            <div
              className={styles.heroBackdrop}
              style={{ backgroundImage: `url(${backdropUrl})` }}
            />
          ) : null}
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroBadges}>
              <span className={styles.heroBadge}>Ranked {rankLabel}</span>
              <span className={styles.heroBadgeMuted}>Popularity {popularityLabel}</span>
            </div>
            <h1 className={styles.heroTitle}>{data.title || 'Unknown Title'}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.scorePill}>{scoreLabel}</span>
              <span className={styles.metaText}>Score</span>
              <span className={styles.metaDivider} />
              <span className={styles.metaText}>{isAiring ? 'Finished Airing' : (data.status || 'Unknown')}</span>
              <span className={styles.metaDivider} />
              <span className={styles.metaText}>{episodeLabel}</span>
            </div>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} type="button">Add to List</button>
              <button className={styles.secondaryButton} type="button">Track Progress</button>
            </div>
          </div>
          <div className={styles.heroPoster}>
            <div className={styles.posterFrame}>
              <Image
                className={styles.poster}
                src={posterUrl || '/vercel.svg'}
                alt={data.title || 'Anime poster'}
                width={280}
                height={380}
              />
            </div>
          </div>
        </section>

        <section className={styles.mainGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.section}>
              <div className={styles.sectionEyebrow}>Synopsis</div>
              <h2 className={styles.sectionTitle}>{shortSynopsis || synopsisText}</h2>
              {secondarySynopsis ? (
                <p className={styles.sectionBody}>{secondarySynopsis}</p>
              ) : null}
            </div>
            <div className={styles.section} id="trailer">
              <div className={styles.sectionEyebrow}>Official Trailer</div>
              <h2 className={styles.sectionTitle}>Official Trailer</h2>
              {trailerUrl ? (
                <div className={styles.videoFrame}>
                  <div className={styles.videoBadge}>Trailer</div>
                  <iframe
                    className={styles.animeTrailer}
                    allow="accelerometer; fullscreen;clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    src={trailerUrl}
                  />
                </div>
              ) : (
                <p className={styles.sectionBody}>Trailer not available.</p>
              )}
            </div>
            <div className={styles.section}>
              <div className={styles.sectionEyebrow}>Background</div>
              <h2 className={styles.sectionTitle}>Background</h2>
              <p className={styles.sectionBody}>{backgroundText}</p>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionEyebrow}>Key Characters</div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Key Characters</h2>
                <button className={styles.linkButton} type="button">View All Characters</button>
              </div>
              <div className={styles.keyCharacters}>
                {characters.length === 0 ? (
                  <p className={styles.sectionBody}>Characters unavailable.</p>
                ) : (
                  characters.slice(0, 4).map((character, index) => (
                    <div className={styles.characterCard} key={`${character?.character?.name || 'Character'}-${index}`}>
                      <div className={styles.characterAvatar}>
                        <Image
                          src={character?.character?.images?.webp?.image_url
                            || character?.character?.images?.jpg?.image_url
                            || '/logo_no_text.png'}
                          alt={character?.character?.name || 'Character'}
                          width={60}
                          height={60}
                        />
                      </div>
                      <div>
                        <div className={styles.characterName}>{character?.character?.name || 'Unknown'}</div>
                        <div className={styles.characterRole}>{character?.role || 'Role'}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className={styles.sideColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Quick Facts</h3>
                <span className={styles.cardBadge}>{data.type || 'TV'}</span>
              </div>
              <div className={styles.factRow}>
                <span>Status</span>
                <strong>{data.status || 'Unknown'}</strong>
              </div>
              <div className={styles.factRow}>
                <span>Aired</span>
                <strong>{seasonLabel}</strong>
              </div>
              <div className={styles.factRow}>
                <span>Episodes</span>
                <strong>{episodeLabel}</strong>
              </div>
              <div className={styles.factRow}>
                <span>Rating</span>
                <strong>{ratingLabel}</strong>
              </div>
              <div className={styles.factRow}>
                <span>Genres</span>
                <strong>{genres.slice(0, 2).map((genre) => genre.name).join(', ') || 'Unknown'}</strong>
              </div>
              <div className={styles.tagRow}>
                {genres.slice(0, 4).map((genre) => (
                  <span className={styles.genreTag} key={genre.mal_id}>{genre.name}</span>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>External</h3>
              <div className={styles.factRow}>
                <span>Official Website</span>
                <strong>{data?.url ? 'Visit' : 'N/A'}</strong>
              </div>
              <div className={styles.factRow}>
                <span>Anime DB</span>
                <strong>{data?.url ? 'MAL' : 'N/A'}</strong>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {

  const baseurl = "https://api.jikan.moe/v4";

  const { id } = context.query
  const [anime, characters] = await Promise.all([
    fetch(`${baseurl}/anime/${id}`),
    fetch(`${baseurl}/anime/${id}/characters`)
  ])
  const [animeResposta, charactersResposta] = await Promise.all([
    anime.json(),
    characters.json()
  ])
  return {
    props: {
      animeResposta,
      charactersResposta,
    }
  }
}
