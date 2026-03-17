import { useMemo, useState } from 'react';
import Image from 'next/image';
import Layout from '../../components/layout/Layout';
import styles from '../../styles/anime.module.css';
import { getAnimeById, getAnimeCharacters } from '../../lib/services/jikan';
import { isHentaiAnime } from '../../lib/utils/anime';
import { normalizeAnime } from '../../lib/utils/anime';
import { formatSeasonLabel } from '../../lib/utils/season';
import { getAnimeBannerUrl, getAnimeImageUrl, getCharacterAvatarUrl } from '../../lib/utils/media';
import useMyList from '../../hooks/useMyList';
import useAuth from '../../hooks/useAuth';
import { ensureAnimeCatalog } from '../../lib/services/animeCatalog';
import { addUserActivity, upsertUserAnime } from '../../lib/services/userAnime';

export default function AnimeDetail({ animeResposta, charactersResposta }) {
  const data = animeResposta?.data ?? {};
  const genres = Array.isArray(data.genres)
    ? data.genres.filter((genre) => genre?.name !== 'Hentai')
    : [];
  const producers = Array.isArray(data.producers) ? data.producers : [];
  const posterUrl = getAnimeImageUrl(data);
  const backdropUrl = getAnimeBannerUrl(data);
  const trailerUrl = data?.trailer?.embed_url || '';
  const seasonLabel = formatSeasonLabel(data?.season, data?.year);
  const studioName =
    Array.isArray(data.studios) && data.studios.length > 0 ? data.studios[0].name : 'Unknown';
  const ratingLabel = data?.rating || 'Not Rated';
  const scoreLabel = typeof data?.score === 'number' ? data.score.toFixed(2) : 'N/A';
  const statusLabel = data?.airing ? 'Airing' : data.status || 'Unknown';
  const characters = Array.isArray(charactersResposta?.data) ? charactersResposta.data : [];
  const rankLabel = data?.rank ? `#${data.rank}` : 'N/A';
  const popularityLabel = data?.popularity ? `#${data.popularity}` : 'N/A';
  const episodeLabel = data?.episodes ? `${data.episodes} (${data?.duration || '23 min'})` : 'TBA';
  const synopsisText = data.synopsis || 'Synopsis not available.';
  const [shortSynopsis, ...restSynopsis] = synopsisText.split('. ');
  const secondarySynopsis = restSynopsis.join('. ').trim();
  const backgroundText = data?.background || '';
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const normalized = useMemo(() => normalizeAnime(data), [data]);
  const { addItem, removeItem, isInList, canEdit } = useMyList();
  const { user } = useAuth();

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title={`${data.title || 'Anime'} - AnimeLegacy`}
      description={data.synopsis || 'Anime details, characters, and highlights.'}
    >
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
              <span className={styles.metaText}>{statusLabel}</span>
              <span className={styles.metaDivider} />
              <span className={styles.metaText}>{episodeLabel}</span>
            </div>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                type="button"
                disabled={!canEdit || !normalized}
                onClick={() => {
                  if (!normalized) return;
                  if (!canEdit) return;
                  if (isInList(normalized.id)) {
                    removeItem(normalized.id);
                  } else {
                    addItem(normalized);
                  }
                }}
              >
                {!canEdit
                  ? 'Login to Add'
                  : normalized && isInList(normalized.id)
                    ? 'Remove from List'
                    : 'Add to List'}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={!user}
                onClick={async () => {
                  if (!user) return;
                  await ensureAnimeCatalog(data);
                  await upsertUserAnime({
                    uid: user.uid,
                    anime: data,
                    overrides: { status: 'watching' },
                  });
                  await addUserActivity({
                    uid: user.uid,
                    activity: {
                      animeId: String(data.mal_id || data.id || ''),
                      title: data.title || 'Untitled',
                      posterUrl: getAnimeImageUrl(data) || '',
                      type: 'watching',
                      label: 'Started watching',
                    },
                  });
                }}
              >
                Track Progress
              </button>
            </div>
          </div>
          <div className={styles.heroPoster}>
            <div className={styles.posterFrame}>
              <Image
                className={styles.poster}
                src={posterUrl || '/logo_no_text.png'}
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
              {secondarySynopsis ? <p className={styles.sectionBody}>{secondarySynopsis}</p> : null}
            </div>
            <div className={styles.section} id="trailer">
              <div className={styles.sectionEyebrow}>Official Trailer</div>
              <h2 className={styles.sectionTitle}>Official Trailer</h2>
              {trailerUrl ? (
                <div className={styles.videoFrame}>
                  <div className={styles.videoBadge}>Trailer</div>
                  <iframe
                    className={styles.animeTrailer}
                    title="Official trailer"
                    allow="accelerometer; fullscreen;clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    src={trailerUrl}
                  />
                </div>
              ) : (
                <p className={styles.sectionBody}>Trailer not available.</p>
              )}
            </div>
            {backgroundText ? (
              <div className={styles.section}>
                <div className={styles.sectionEyebrow}>Background</div>
                <h2 className={styles.sectionTitle}>Background</h2>
                <p className={styles.sectionBody}>{backgroundText}</p>
              </div>
            ) : null}
            <div className={styles.section}>
              <div className={styles.sectionEyebrow}>Key Characters</div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Key Characters</h2>
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={() => setShowAllCharacters((prev) => !prev)}
                >
                  {showAllCharacters ? 'Show Less' : 'View All Characters'}
                </button>
              </div>
              <div className={styles.keyCharacters}>
                {characters.length === 0 ? (
                  <p className={styles.sectionBody}>Characters unavailable.</p>
                ) : (
                  (() => {
                    const mains = characters.filter((entry) => entry?.role === 'Main');
                    const supporting = characters.filter((entry) => entry?.role !== 'Main');
                    const ordered = [...mains, ...supporting];
                    const limit = showAllCharacters ? ordered.length : 4;
                    const items = ordered.slice(0, limit).map((entry) => {
                      const actor = Array.isArray(entry?.voice_actors)
                        ? entry.voice_actors.find((item) => item?.language === 'Japanese') ||
                          entry.voice_actors[0]
                        : null;
                      return { entry, actor };
                    });
                    return (
                      <>
                        <div className={styles.keyHeader}>Characters</div>
                        <div className={styles.keyHeader}>Voice Actors</div>
                        {items.map(({ entry, actor }, index) => (
                          <div
                            className={styles.keyRow}
                            key={`${entry?.character?.name || 'Character'}-${index}`}
                          >
                            <div className={styles.characterCard}>
                              <div className={styles.characterAvatar}>
                                <Image
                                  src={getCharacterAvatarUrl(entry) || '/logo_no_text.png'}
                                  alt={entry?.character?.name || 'Character'}
                                  width={60}
                                  height={60}
                                />
                              </div>
                              <div>
                                <div className={styles.characterName}>
                                  {entry?.character?.name || 'Unknown'}
                                </div>
                                <div className={styles.characterRole}>{entry?.role || 'Role'}</div>
                              </div>
                            </div>
                            <div className={styles.actorCard}>
                              <div className={styles.actorAvatar}>
                                <Image
                                  src={
                                    actor?.person?.images?.jpg?.image_url ||
                                    actor?.person?.images?.webp?.image_url ||
                                    '/logo_no_text.png'
                                  }
                                  alt={actor?.person?.name || 'Voice actor'}
                                  width={48}
                                  height={48}
                                />
                              </div>
                              <div>
                                <div className={styles.actorName}>
                                  {actor?.person?.name || 'Unknown'}
                                </div>
                                <div className={styles.actorLanguage}>
                                  {actor?.language || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()
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
                <strong>
                  {genres
                    .slice(0, 2)
                    .map((genre) => genre.name)
                    .join(', ') || 'Unknown'}
                </strong>
              </div>
              <div className={styles.tagRow}>
                {genres.slice(0, 4).map((genre) => (
                  <span className={styles.genreTag} key={genre.mal_id}>
                    {genre.name}
                  </span>
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
              <div className={styles.factRow}>
                <span>Studios</span>
                <strong>{studioName}</strong>
              </div>
              <div className={styles.factRow}>
                <span>Producers</span>
                <strong>
                  {producers
                    .slice(0, 2)
                    .map((producer) => producer.name)
                    .join(', ') || 'Unknown'}
                </strong>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.query;
  const [animeResposta, charactersResposta] = await Promise.all([
    getAnimeById(id),
    getAnimeCharacters(id),
  ]);

  if (isHentaiAnime(animeResposta?.data)) {
    return { notFound: true };
  }
  return {
    props: {
      animeResposta,
      charactersResposta,
    },
  };
}
