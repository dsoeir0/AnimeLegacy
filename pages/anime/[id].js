import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Check, Heart, BookOpen, ArrowLeft, ArrowRight, Pencil, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
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

function AnimeDetail({ animeResposta, charactersResposta, t }) {
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
    Array.isArray(data.studios) && data.studios.length > 0 ? data.studios[0].name : t('status.unknown');
  const studioList = Array.isArray(data.studios) ? data.studios.map((s) => s.name).join(' / ') : studioName;
  const score = typeof data?.score === 'number' ? data.score : 0;
  const statusLabel = data?.airing ? t('status.airing') : data.status || t('status.unknown');
  const characters = Array.isArray(charactersResposta?.data) ? charactersResposta.data : [];
  const rank = data?.rank || null;
  const episodesCount = data?.episodes || 0;
  const synopsisText = data.synopsis || t('anime.synopsisMissing');
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
      title={`${data.title || t('anime.unknownTitle')} · ${t('anime.metaTitleSuffix')}`}
      description={data.synopsis || t('anime.metaDescFallback')}
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
            {t('actions.back')}
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
              <h1 className={styles.title}>{data.title || t('anime.unknownTitle')}</h1>
              {data.title_japanese ? (
                <div className={styles.subTitle}>{data.title_japanese}</div>
              ) : null}

              <div className={styles.actions}>
                {!canEdit || !normalized ? (
                  <Link href="/sign-in" className={styles.actionLink}>
                    <Button variant="secondary" size="lg" icon={Plus}>
                      {t('actions.loginToAdd')}
                    </Button>
                  </Link>
                ) : currentEntry ? (
                  <Button
                    variant="collection"
                    size="lg"
                    icon={Check}
                    onClick={() => openAddModal(normalized, currentEntry)}
                  >
                    {t('actions.inYourListStatus', {
                      status: t(STATUS_META[currentEntry.status]?.labelKey || 'status.watching'),
                    })}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Plus}
                    onClick={() => openAddModal(normalized)}
                  >
                    {t('actions.addToList')}
                  </Button>
                )}
                {currentEntry ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={Heart}
                    onClick={() => openAddModal(normalized, currentEntry)}
                  >
                    {currentEntry.isFavorite ? t('actions.favorited') : t('actions.favorite')}
                  </Button>
                ) : null}
                {trailerUrl ? (
                  <a className={styles.actionLink} href="#trailer">
                    <Button variant="ghost" size="lg" icon={BookOpen}>
                      {t('actions.watchTrailer')}
                    </Button>
                  </a>
                ) : null}
              </div>

              <div className={styles.metaStrip}>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>{t('anime.malScore')}</div>
                  <div className={styles.metaValue}>{score ? score.toFixed(2) : '—'}</div>
                  <div className={styles.metaSub}>
                    {rank ? t('anime.rank', { n: rank }) : t('anime.unranked')}
                  </div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>{t('anime.episodes')}</div>
                  <div className={styles.metaValue}>{episodesCount || t('anime.tba')}</div>
                  <div className={styles.metaSub}>{data.type || 'TV'}</div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>{t('anime.statusLabel')}</div>
                  <div className={styles.metaValueSmall}>{statusLabel}</div>
                  <div className={styles.metaSub}>{seasonLabel || '—'}</div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>{t('anime.studio')}</div>
                  <div className={styles.metaValueSmall}>{studioName}</div>
                  <div className={styles.metaSub}>
                    {studioList.includes('/') ? studioList.split(' / ').slice(1).join(' / ') : ratingLabel}
                  </div>
                </div>
                <div className={styles.metaCell}>
                  <div className={styles.metaLabel}>{t('anime.genres')}</div>
                  <div className={styles.metaValue}>{genres.length}</div>
                  <div className={styles.metaSub}>{genres.slice(0, 2).join(', ') || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mainGrid}>
            <div className={styles.mainColumn}>
              <section className={styles.section}>
                <div className={styles.sectionEyebrow}>{t('anime.synopsisEyebrow')}</div>
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
                  <div className={styles.sectionEyebrow}>{t('anime.trailerEyebrow')}</div>
                  <h3 className={styles.sectionTitle}>{t('anime.trailerTitle')}</h3>
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
                  <div className={styles.sectionEyebrow}>{t('anime.backgroundEyebrow')}</div>
                  <p className={styles.synopsisText}>{backgroundText}</p>
                </section>
              ) : null}

              <section className={styles.section}>
                <div className={styles.sectionHeaderRow}>
                  <div>
                    <div className={styles.sectionEyebrow}>{t('anime.castEyebrow')}</div>
                    <h3 className={styles.sectionTitle}>{t('anime.castTitle')}</h3>
                  </div>
                  {orderedChars.length > 6 ? (
                    <Button
                      variant="plain"
                      size="sm"
                      iconRight={ArrowRight}
                      onClick={() => setShowAllCharacters((p) => !p)}
                    >
                      {showAllCharacters ? t('actions.showLess') : t('actions.viewAll')}
                    </Button>
                  ) : null}
                </div>
                {visibleChars.length === 0 ? (
                  <p className={styles.synopsisText}>{t('anime.castUnavailable')}</p>
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
                              <div className={styles.castName}>{entry?.character?.name || t('status.unknown')}</div>
                              <div className={styles.castRole}>{entry?.role || t('anime.roleLabel')}</div>
                              <div className={styles.castVA}>
                                <span className={styles.castVALabel}>{t('anime.cv')} · </span>
                                <span className={styles.castVAName}>{actor?.person?.name || t('status.unknown')}</span>
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
                <div className={styles.sectionEyebrow}>{t('anime.yourProgress')}</div>
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
                        <div className={styles.miniLabel}>{t('anime.yourScore')}</div>
                        <div className={styles.miniScore}>{currentEntry.rating || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.miniLabel}>{t('anime.favorited')}</div>
                        <div className={styles.miniValue}>
                          {currentEntry.isFavorite ? t('anime.favoritedYes') : t('anime.favoritedNo')}
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
                        {t('actions.updateEntry')}
                      </Button>
                      {displayStatus === 'completed' ? (
                        <Button
                          variant="ghost"
                          size="md"
                          fullWidth
                          icon={Star}
                          onClick={openRatingModal}
                        >
                          {t('actions.rateReview')}
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.asideEmpty}>{t('anime.notInList')}</p>
                    {canEdit && normalized ? (
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        icon={Plus}
                        onClick={() => openAddModal(normalized)}
                      >
                        {t('actions.addToList')}
                      </Button>
                    ) : (
                      <Link href="/sign-in" className={styles.actionLink}>
                        <Button variant="secondary" size="md" fullWidth>
                          {t('anime.signInTrack')}
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className={styles.asideCard}>
                <div className={styles.sectionEyebrow}>{t('anime.communityEyebrow')}</div>
                <div className={styles.asideStats}>
                  {score ? <RatingDisplay score={score} size="lg" /> : null}
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.members')}</span>
                    <strong>{data?.members?.toLocaleString() || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.scoredBy')}</span>
                    <strong>{data?.scored_by?.toLocaleString() || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.popularity')}</span>
                    <strong>{data?.popularity ? `#${data.popularity}` : '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.favorites')}</span>
                    <strong>{data?.favorites?.toLocaleString() || '—'}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.asideCard}>
                <div className={styles.sectionEyebrow}>{t('anime.detailsEyebrow')}</div>
                <div className={styles.asideStats}>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.source')}</span>
                    <strong>{data?.source || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.duration')}</span>
                    <strong>{durationLabel}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.aired')}</span>
                    <strong>{data?.aired?.string || '—'}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.rating')}</span>
                    <strong>{ratingLabel}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.studios')}</span>
                    <strong>{studioName}</strong>
                  </div>
                  <div className={styles.asideStatRow}>
                    <span>{t('anime.producers')}</span>
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

export default translate(AnimeDetail);

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
