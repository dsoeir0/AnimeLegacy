import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Check, Heart, BookOpen, ArrowLeft, ArrowRight, Pencil, Star } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import StatusBadge, { STATUS_META } from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import RatingDisplay from '../../components/ui/RatingDisplay';
import AddToListModal from '../../components/modals/AddToListModal';
import RatingReviewModal from '../../components/modals/RatingReviewModal';
import styles from './[id].module.css';
import { getAnimeById, getAnimeCharacters } from '../../lib/services/jikan';
import { isHentaiAnime, isAiringAnime, normalizeAnime } from '../../lib/utils/anime';
import { formatSeasonLabel } from '../../lib/utils/season';
import { getAnimeBannerUrl, getAnimeImageUrl, getCharacterAvatarUrl } from '../../lib/utils/media';
import useMyList from '../../hooks/useMyList';

export default function AnimeDetail({ animeResposta, charactersResposta }) {
  const router = useRouter();
  const data = animeResposta?.data ?? {};
  const genres = Array.isArray(data.genres)
    ? data.genres.filter((genre) => genre?.name !== 'Hentai').map((g) => g.name)
    : [];
  const producers = Array.isArray(data.producers) ? data.producers : [];
  const posterUrl = getAnimeImageUrl(data) || '/logo_no_text.png';
  const backdropUrl = getAnimeBannerUrl(data) || posterUrl;
  const trailerUrl = data?.trailer?.embed_url || '';
  const seasonLabel = formatSeasonLabel(data?.season, data?.year);
  const studioName =
    Array.isArray(data.studios) && data.studios.length > 0 ? data.studios[0].name : 'Unknown';
  const studioList = Array.isArray(data.studios) ? data.studios.map((s) => s.name).join(' / ') : studioName;
  const score = typeof data?.score === 'number' ? data.score : 0;
  const statusLabel = data?.airing ? 'Airing' : data.status || 'Unknown';
  const characters = Array.isArray(charactersResposta?.data) ? charactersResposta.data : [];
  const rank = data?.rank || null;
  const episodesCount = data?.episodes || 0;
  const synopsisText = data.synopsis || 'Synopsis not available.';
  const backgroundText = data?.background || '';
  const ratingLabel = data?.rating || 'Not Rated';
  const durationLabel = data?.duration || '—';
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const normalized = useMemo(() => normalizeAnime(data), [data]);
  const { addItem, getEntry, canEdit, favoritesCount } = useMyList();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingAnime, setPendingAnime] = useState(null);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingEntry, setRatingEntry] = useState(null);
  const currentEntry = normalized ? getEntry(normalized.id) : null;
  const displayProgress = typeof currentEntry?.progress === 'number' ? currentEntry.progress : 0;
  const displayStatus =
    isAiringAnime(data) && currentEntry?.status === 'completed'
      ? 'watching'
      : currentEntry?.status || 'watching';

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
  const openRatingModal = () => {
    if (!normalized) return;
    setRatingEntry(getEntry(normalized.id) || {});
    setRatingModalOpen(true);
  };
  const closeRatingModal = () => {
    setRatingModalOpen(false);
    setRatingEntry(null);
  };
  const handleSaveRating = async ({ rating, review }) => {
    if (!normalized) return;
    const detail = ratingEntry || {};
    await addItem(normalized, {
      status: detail.status || 'completed',
      progress: typeof detail.progress === 'number' ? detail.progress : 0,
      isFavorite: Boolean(detail.isFavorite),
      rating,
      review,
      keepAddedAt: true,
    });
    closeRatingModal();
  };

  const mains = characters.filter((entry) => entry?.role === 'Main');
  const supporting = characters.filter((entry) => entry?.role !== 'Main');
  const orderedChars = [...mains, ...supporting];
  const visibleChars = showAllCharacters ? orderedChars : orderedChars.slice(0, 6);

  return (
    <Layout
      title={`${data.title || 'Anime'} · AnimeLegacy`}
      description={data.synopsis || 'Anime details, characters, and highlights.'}
    >
      <div className={styles.page}>
        <div className={styles.hero}>
          <Image
            src={backdropUrl}
            alt=""
            fill
            sizes="100vw"
            className={styles.heroImage}
            priority

          />
          <div className={styles.heroGradient} />
          <button type="button" className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.headGrid}>
            <div className={styles.posterFrame}>
              <Image
                src={posterUrl}
                alt={data.title || 'Poster'}
                width={280}
                height={400}
                className={styles.poster}

              />
            </div>

            <div className={styles.headBody}>
              <div className={styles.eyebrow}>
                {studioName} {seasonLabel ? `· ${seasonLabel}` : ''}
              </div>
              <h1 className={styles.title}>{data.title || 'Unknown title'}</h1>
              {data.title_japanese ? (
                <div className={styles.subTitle}>{data.title_japanese}</div>
              ) : null}

              <div className={styles.actions}>
                {!canEdit || !normalized ? (
                  <Link href="/sign-in" className={styles.actionLink}>
                    <Button variant="secondary" size="lg" icon={Plus}>
                      Login to add
                    </Button>
                  </Link>
                ) : currentEntry ? (
                  <Button
                    variant="collection"
                    size="lg"
                    icon={Check}
                    onClick={() => openAddModal(normalized, currentEntry)}
                  >
                    In your list · {STATUS_META[currentEntry.status]?.label || 'Watching'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Plus}
                    onClick={() => openAddModal(normalized)}
                  >
                    Add to list
                  </Button>
                )}
                {currentEntry ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={Heart}
                    onClick={() => openAddModal(normalized, currentEntry)}
                  >
                    {currentEntry.isFavorite ? 'Favorited' : 'Favorite'}
                  </Button>
                ) : null}
                {trailerUrl ? (
                  <a className={styles.actionLink} href="#trailer">
                    <Button variant="ghost" size="lg" icon={BookOpen}>
                      Watch trailer
                    </Button>
                  </a>
                ) : null}
              </div>

              <div className={styles.metaStrip}>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>MAL SCORE</div>
                  <div className={styles.metaValue}>{score ? score.toFixed(2) : '—'}</div>
                  <div className={styles.metaSub}>{rank ? `Rank #${rank}` : 'Unranked'}</div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>EPISODES</div>
                  <div className={styles.metaValue}>{episodesCount || 'TBA'}</div>
                  <div className={styles.metaSub}>{data.type || 'TV'}</div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>STATUS</div>
                  <div className={styles.metaValueSmall}>{statusLabel}</div>
                  <div className={styles.metaSub}>{seasonLabel || '—'}</div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>STUDIO</div>
                  <div className={styles.metaValueSmall}>{studioName}</div>
                  <div className={styles.metaSub}>
                    {studioList.includes('/') ? studioList.split(' / ').slice(1).join(' / ') : ratingLabel}
                  </div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>GENRES</div>
                  <div className={styles.metaValue}>{genres.length}</div>
                  <div className={styles.metaSub}>{genres.slice(0, 2).join(', ') || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mainGrid}>
            <div className={styles.mainColumn}>
              <section className={styles.section}>
                <div className={styles.sectionEyebrow}>SYNOPSIS</div>
                <p className={styles.synopsisText}>{synopsisText}</p>
                <div className={styles.genreTags}>
                  {genres.map((g) => (
                    <span key={g} className={styles.genreTag}>
                      {g}
                    </span>
                  ))}
                </div>
              </section>

              {trailerUrl ? (
                <section className={styles.section} id="trailer">
                  <div className={styles.sectionEyebrow}>OFFICIAL TRAILER</div>
                  <h3 className={styles.sectionTitle}>Watch the trailer</h3>
                  <div className={styles.videoFrame}>
                    <iframe
                      className={styles.trailerEmbed}
                      title="Official trailer"
                      allow="accelerometer; fullscreen; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      src={trailerUrl}
                    />
                  </div>
                </section>
              ) : null}

              {backgroundText ? (
                <section className={styles.section}>
                  <div className={styles.sectionEyebrow}>BACKGROUND</div>
                  <p className={styles.synopsisText}>{backgroundText}</p>
                </section>
              ) : null}

              <section className={styles.section}>
                <div className={styles.sectionHeaderRow}>
                  <div>
                    <div className={styles.sectionEyebrow}>CAST</div>
                    <h3 className={styles.sectionTitle}>Main characters</h3>
                  </div>
                  {orderedChars.length > 6 ? (
                    <Button
                      variant="plain"
                      size="sm"
                      iconRight={ArrowRight}
                      onClick={() => setShowAllCharacters((p) => !p)}
                    >
                      {showAllCharacters ? 'Show less' : 'View all'}
                    </Button>
                  ) : null}
                </div>
                {visibleChars.length === 0 ? (
                  <p className={styles.synopsisText}>Characters unavailable.</p>
                ) : (
                  <div className={styles.castGrid}>
                    {visibleChars.map((entry, index) => {
                      const actor = Array.isArray(entry?.voice_actors)
                        ? entry.voice_actors.find((v) => v?.language === 'Japanese') || entry.voice_actors[0]
                        : null;
                      const charAvatar = getCharacterAvatarUrl(entry) || '/logo_no_text.png';
                      const charId = entry?.character?.mal_id;
                      const actorImage =
                        actor?.person?.images?.webp?.image_url ||
                        actor?.person?.images?.jpg?.image_url ||
                        '/logo_no_text.png';
                      return (
                        <div className={styles.castCard} key={`${entry?.character?.name || 'c'}-${index}`}>
                          <Link href={charId ? `/characters/${charId}` : '#'} className={styles.castLeft}>
                            <Image
                              src={charAvatar}
                              alt={entry?.character?.name || 'Character'}
                              width={60}
                              height={84}
                              className={styles.castAvatar}

                            />
                            <div className={styles.castMeta}>
                              <div className={styles.castName}>{entry?.character?.name || 'Unknown'}</div>
                              <div className={styles.castRole}>{entry?.role || 'Role'}</div>
                              <div className={styles.castVA}>
                                <span className={styles.castVALabel}>CV · </span>
                                <span className={styles.castVAName}>{actor?.person?.name || 'Unknown'}</span>
                              </div>
                            </div>
                          </Link>
                          {actor?.person ? (
                            <Image
                              src={actorImage}
                              alt={actor.person.name}
                              width={44}
                              height={44}
                              className={styles.castVAImg}

                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.sideColumn}>
              <div className={styles.asideCard}>
                <div className={styles.sectionEyebrow}>YOUR PROGRESS</div>
                {currentEntry ? (
                  <>
                    <div className={styles.asideStatus}>
                      <StatusBadge status={displayStatus} size="md" />
                    </div>
                    <div className={styles.asideProgress}>
                      <ProgressBar
                        value={displayProgress}
                        total={episodesCount || 0}
                        variant={displayStatus === 'completed' ? 'completed' : 'primary'}
                      />
                    </div>
                    <div className={styles.asideMetaGrid}>
                      <div>
                        <div className={styles.miniLabel}>YOUR SCORE</div>
                        <div className={styles.miniScore}>{currentEntry.rating || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.miniLabel}>FAVORITED</div>
                        <div className={styles.miniValue}>
                          {currentEntry.isFavorite ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.asideActions}>
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        icon={Pencil}
                        onClick={() => openAddModal(normalized, currentEntry)}
                      >
                        Update entry
                      </Button>
                      {displayStatus === 'completed' ? (
                        <Button
                          variant="ghost"
                          size="md"
                          fullWidth
                          icon={Star}
                          onClick={openRatingModal}
                        >
                          Rate & review
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.asideEmpty}>Not in your list yet.</p>
                    {canEdit && normalized ? (
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        icon={Plus}
                        onClick={() => openAddModal(normalized)}
                      >
                        Add to list
                      </Button>
                    ) : (
                      <Link href="/sign-in" className={styles.actionLink}>
                        <Button variant="secondary" size="md" fullWidth>
                          Sign in to track
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className={styles.asideCard}>
                <div className={styles.sectionEyebrow}>COMMUNITY</div>
                <div className={styles.asideStats}>
                  {score ? <RatingDisplay score={score} size="lg" /> : null}
                  <div className={styles.asideStatRow}>
                    <span>Members</span>
                    <strong>{data?.members?.toLocaleString() || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Scored by</span>
                    <strong>{data?.scored_by?.toLocaleString() || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Popularity</span>
                    <strong>{data?.popularity ? `#${data.popularity}` : '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Favorites</span>
                    <strong>{data?.favorites?.toLocaleString() || '—'}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.asideCard}>
                <div className={styles.sectionEyebrow}>DETAILS</div>
                <div className={styles.asideStats}>
                  <div className={styles.asideStatRow}>
                    <span>Source</span>
                    <strong>{data?.source || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Duration</span>
                    <strong>{durationLabel}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Aired</span>
                    <strong>{data?.aired?.string || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Rating</span>
                    <strong>{ratingLabel}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Studios</span>
                    <strong>{studioName}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>Producers</span>
                    <strong>{producers.slice(0, 2).map((p) => p.name).join(', ') || '—'}</strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <RatingReviewModal
        open={ratingModalOpen}
        anime={normalized}
        initialRating={ratingEntry?.rating}
        initialReview={ratingEntry?.review}
        onClose={closeRatingModal}
        onSave={handleSaveRating}
      />
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

export async function getServerSideProps(context) {
  const { id } = context.query;
  const [animeResposta, charactersResposta] = await Promise.all([
    getAnimeById(id),
    getAnimeCharacters(id),
  ]);
  if (isHentaiAnime(animeResposta?.data)) {
    return { notFound: true };
  }
  return { props: { animeResposta, charactersResposta } };
}
