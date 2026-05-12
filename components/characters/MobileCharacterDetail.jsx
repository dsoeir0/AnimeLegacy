import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ChevronRight, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { localizeRole, localizeLanguage } from '../../lib/utils/charLocalize';
import { formatFivePoint } from '../../lib/utils/rating';
import { truncateText } from '../../lib/utils/text';
import styles from './MobileCharacterDetail.module.css';

function MobileCharacterDetail({
  character,
  imageUrl,
  appearances,
  voices,
  bioText,
  favoriteCount,
  isFavorite,
  favoriteError,
  favoriteLoaded,
  onToggleFavorite,
  canFavorite,
  t,
}) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);

  const primary = useMemo(
    () =>
      appearances.find((e) => e?.role && e.role.toLowerCase() === 'main') ||
      appearances[0] ||
      null,
    [appearances],
  );

  const [voicesExpanded, setVoicesExpanded] = useState(false);
  const visibleVoices = voicesExpanded ? voices : voices.slice(0, 4);
  const [appearancesExpanded, setAppearancesExpanded] = useState(false);
  const subtitleParts = [
    character?.name_kanji || '',
    character?.age ? t('character.stats.ageShort', { v: character.age }) : '',
    character?.height ? character.height : '',
  ].filter(Boolean);

  const visibleAppearances = appearancesExpanded ? appearances : appearances.slice(0, 4);
  const nicknames = Array.isArray(character?.nicknames)
    ? character.nicknames.slice(0, 3)
    : [];

  return (
    <div className={styles.mobile}>
      <div className={styles.hero}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className={styles.heroImg}
          />
        ) : null}
        <div className={styles.heroGradTop} />
        <div className={styles.heroGradBottom} />

        <button
          type="button"
          className={styles.glassBtn}
          aria-label={t('actions.back')}
          onClick={() => router.back()}
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
        </button>

        <div className={styles.heroBody}>
          {primary ? (
            <div className={styles.heroEyebrow}>
              {localizeRole(primary?.role, t).toUpperCase()}
              {primary?.anime?.title ? (
                <>
                  <span className={styles.heroEyebrowDot} />
                  {primary.anime.title.toUpperCase()}
                </>
              ) : null}
            </div>
          ) : null}
          <h1 className={styles.heroTitle}>{character?.name || t('status.unknown')}</h1>
          {subtitleParts.length > 0 ? (
            <div className={styles.heroSubtitle}>
              {subtitleParts.map((p, i) => (
                <span key={`sub-${i}`}>
                  {p}
                  {i < subtitleParts.length - 1 ? <span className={styles.heroSubDot} /> : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={`${styles.ctaPrimary} ${isFavorite ? styles.ctaPrimaryOn : ''}`}
          onClick={onToggleFavorite}
          disabled={!canFavorite || !favoriteLoaded}
        >
          <Star size={14} strokeWidth={2.2} fill={isFavorite ? 'currentColor' : 'none'} />
          {isFavorite ? t('actions.favorited') : t('actions.favorite')}
        </button>
      </div>

      {favoriteError ? (
        <div className={styles.errorRow}>{favoriteError}</div>
      ) : null}

      <div className={styles.kpiStrip}>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>{appearances.length}</span>
          <span className={styles.kpiLabel}>{t('character.kpiAppearances')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>
            {favoriteCount > 999
              ? `${(favoriteCount / 1000).toFixed(1)}k`
              : favoriteCount.toLocaleString()}
          </span>
          <span className={styles.kpiLabel}>{t('character.kpiFavorites')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>{voices.length}</span>
          <span className={styles.kpiLabel}>{t('character.kpiVoices')}</span>
        </div>
      </div>

      {nicknames.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.tagRow}>
            {nicknames.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        </div>
      ) : null}

      {voices.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t('character.voiceActorsTitle')}</h2>
            <span className={styles.sectionMeta}>
              {t('character.listedCount', { n: voices.length })}
            </span>
          </div>
          <div className={styles.voiceList}>
            {visibleVoices.map((entry, idx) => {
              const actor = entry?.person;
              const portrait =
                actor?.images?.jpg?.image_url || actor?.images?.webp?.image_url || null;
              const key = `${actor?.name || 'v'}-${actor?.mal_id || idx}`;
              const inner = (
                <>
                  <span className={styles.voiceAvatar}>
                    {portrait ? (
                      <Image src={portrait} alt="" fill sizes="44px" />
                    ) : (
                      <span>{(actor?.name || '?').slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className={styles.voiceBody}>
                    <span className={styles.voiceName}>{actor?.name || t('status.unknown')}</span>
                    <span className={styles.voiceMeta}>
                      {localizeLanguage(entry?.language, t).toUpperCase()}
                    </span>
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className={styles.voiceChev} />
                </>
              );
              return actor?.mal_id ? (
                <Link key={key} href={`/voices/${actor.mal_id}`} className={styles.voiceRow}>
                  {inner}
                </Link>
              ) : (
                <div key={key} className={styles.voiceRow}>
                  {inner}
                </div>
              );
            })}
          </div>
          {voices.length > 4 ? (
            <button
              type="button"
              className={styles.voicesToggle}
              onClick={() => setVoicesExpanded((v) => !v)}
            >
              {voicesExpanded
                ? t('actions.showLess')
                : t('character.voicesMore', { n: voices.length - 4 })}
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleAppearances.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t('character.appearancesTitle')}</h2>
            <span className={styles.sectionMeta}>
              {t('character.kpiAppearancesValue', { n: appearances.length })}
            </span>
          </div>
          <div className={styles.appearList}>
            {visibleAppearances.map((entry) => {
              const animeId = entry?.anime?.mal_id;
              const cover = getAnimeImageUrl(entry?.anime);
              const score =
                typeof entry?.anime?.score === 'number' ? entry.anime.score : null;
              const year = entry?.anime?.year || '';
              const key = `${entry?.anime?.title || 'a'}-${animeId || ''}`;
              const inner = (
                <>
                  <span className={styles.appearCover}>
                    {cover ? <Image src={cover} alt="" fill sizes="48px" /> : null}
                  </span>
                  <span className={styles.appearBody}>
                    <span className={styles.appearTitle}>
                      {entry?.anime?.title || t('status.unknown')}
                    </span>
                    <span className={styles.appearMeta}>
                      {localizeRole(entry?.role, t).toUpperCase()}
                      {year ? <span className={styles.appearMetaDot} /> : null}
                      {year || ''}
                    </span>
                  </span>
                  {score !== null ? (
                    <span className={styles.appearScore}>★ {formatFivePoint(score)}</span>
                  ) : null}
                </>
              );
              return animeId ? (
                <Link key={key} href={`/anime/${animeId}`} className={styles.appearRow}>
                  {inner}
                </Link>
              ) : (
                <div key={key} className={styles.appearRow}>
                  {inner}
                </div>
              );
            })}
          </div>
          {appearances.length > 4 ? (
            <button
              type="button"
              className={styles.voicesToggle}
              onClick={() => setAppearancesExpanded((v) => !v)}
            >
              {appearancesExpanded
                ? t('actions.showLess')
                : t('character.appearancesMore', { n: appearances.length - 4 })}
            </button>
          ) : null}
        </div>
      ) : null}

      {bioText ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('character.biographyEyebrow')}</h2>
          <p
            className={`${styles.bio} ${bioExpanded ? '' : styles.bioCollapsed}`}
          >
            {bioExpanded ? bioText : truncateText(bioText, 240)}
          </p>
          {bioText.length > 240 ? (
            <button
              type="button"
              className={styles.bioToggle}
              onClick={() => setBioExpanded((v) => !v)}
            >
              {bioExpanded ? t('actions.showLess') : t('actions.readMore')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default translate(MobileCharacterDetail);
