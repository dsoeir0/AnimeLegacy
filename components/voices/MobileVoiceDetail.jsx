import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { localizeRole } from '../../lib/utils/charLocalize';
import { truncateText } from '../../lib/utils/text';
import { nameInitials } from '../../lib/utils/userDisplay';
import { yearOfVoiceRole } from '../../lib/utils/voiceRoles';
import styles from './MobileVoiceDetail.module.css';

function MobileVoiceDetail({
  person,
  imageUrl,
  voiceEntries,
  animeCount,
  favoriteCount,
  bioText,
  isFavorite,
  favoriteError,
  favoriteLoaded,
  onToggleFavorite,
  canFavorite,
  t,
}) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [rolesExpanded, setRolesExpanded] = useState(false);

  const enrichedRoles = useMemo(
    () =>
      (voiceEntries || []).map((entry) => ({
        entry,
        year: yearOfVoiceRole(entry),
      })),
    [voiceEntries],
  );

  const yearsActive = useMemo(() => {
    const years = enrichedRoles.map((r) => r.year).filter(Number.isFinite);
    if (years.length === 0) return null;
    return Math.max(...years) - Math.min(...years) + 1;
  }, [enrichedRoles]);

  const visibleRoles = rolesExpanded ? enrichedRoles : enrichedRoles.slice(0, 6);
  const kanjiName = [person?.family_name, person?.given_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.mobile}>
      <button
        type="button"
        className={styles.backBtn}
        aria-label={t('actions.back')}
        onClick={() => router.back()}
      >
        <ArrowLeft size={14} strokeWidth={2.2} />
      </button>

      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={person?.name || ''}
              fill
              priority
              sizes="160px"
            />
          ) : (
            <span>{nameInitials(person?.name)}</span>
          )}
        </div>
        <div className={styles.eyebrow}>{t('voice.eyebrow')}</div>
        <h1 className={styles.heroTitle}>{person?.name || t('status.unknown')}</h1>
        {kanjiName ? <div className={styles.heroSubtitle}>{kanjiName}</div> : null}
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
          <span className={styles.kpiValue}>{voiceEntries.length}</span>
          <span className={styles.kpiLabel}>{t('voice.kpiRoles')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>{yearsActive ?? '—'}</span>
          <span className={styles.kpiLabel}>{t('voice.kpiYears')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>
            {Number.isFinite(animeCount) ? animeCount : '—'}
          </span>
          <span className={styles.kpiLabel}>{t('voice.kpiAppearances')}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiValue}>
            {Number.isFinite(favoriteCount) ? favoriteCount : '—'}
          </span>
          <span className={styles.kpiLabel}>{t('voice.kpiFavorites')}</span>
        </div>
      </div>

      {visibleRoles.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t('voice.recentRolesTitle')}</h2>
            <span className={styles.sectionMeta}>
              {voiceEntries.length}
            </span>
          </div>
          <div className={styles.rolesList}>
            {visibleRoles.map(({ entry, year }, idx) => {
              const charId = entry?.character?.mal_id;
              const animeId = entry?.anime?.mal_id;
              const charImg =
                entry?.character?.images?.webp?.image_url ||
                entry?.character?.images?.jpg?.image_url ||
                null;
              const href = charId
                ? `/characters/${charId}`
                : animeId
                  ? `/anime/${animeId}`
                  : null;
              const key = `${charId || 'c'}-${animeId || 'a'}-${idx}`;
              const inner = (
                <>
                  <span className={styles.roleYear}>{year ?? '—'}</span>
                  <span className={styles.roleAvatar}>
                    {charImg ? (
                      <Image src={charImg} alt={entry?.character?.name || ''} fill sizes="44px" />
                    ) : null}
                  </span>
                  <span className={styles.roleBody}>
                    <span className={styles.roleName}>
                      {entry?.character?.name || t('status.unknown')}
                    </span>
                    <span className={styles.roleAnime}>
                      {entry?.anime?.title || '—'}
                    </span>
                    {entry?.role ? (
                      <span className={`${styles.roleTag} ${styles[`roleTag_${String(entry.role).toLowerCase()}`] || ''}`}>
                        {localizeRole(entry.role, t).toUpperCase()}
                      </span>
                    ) : null}
                  </span>
                </>
              );
              return href ? (
                <Link key={key} href={href} className={styles.roleRow}>
                  {inner}
                </Link>
              ) : (
                <div key={key} className={styles.roleRow}>
                  {inner}
                </div>
              );
            })}
          </div>
          {enrichedRoles.length > 6 ? (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setRolesExpanded((v) => !v)}
            >
              {rolesExpanded
                ? t('actions.showLess')
                : t('voice.recentRolesMore', { n: enrichedRoles.length - 6 })}
            </button>
          ) : null}
        </div>
      ) : null}

      {bioText ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('voice.biographyEyebrow')}</h2>
          <p className={`${styles.bio} ${bioExpanded ? '' : styles.bioCollapsed}`}>
            {bioExpanded ? bioText : truncateText(bioText, 240)}
          </p>
          {bioText.length > 240 ? (
            <button
              type="button"
              className={styles.toggle}
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

export default translate(MobileVoiceDetail);
