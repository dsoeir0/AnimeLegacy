import Image from 'next/image';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { pickStudioName, studioInitials } from '../../lib/utils/studio';
import { accentForStudio } from '../../lib/utils/studioAccent';
import styles from './studios.module.css';

const CURRENT_YEAR = new Date().getFullYear();

const yearOf = (iso) => {
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? y : null;
};

const posterUrl = (anime) =>
  anime?.images?.webp?.image_url ||
  anime?.images?.jpg?.image_url ||
  '';

const shortenBio = (about, max = 150) => {
  if (typeof about !== 'string') return '';
  const cleaned = about.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max);
  const cut = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, cut > 80 ? cut : max)}…`;
};

// Grid card for a single studio. Receives its posters via props — the
// parent page batches the fetches in a rate-limit-respecting sweep to
// avoid hammering Jikan's 3 req/s limit.
function StudioCard({ studio, posters, postersLoading, t }) {
  const name = pickStudioName(studio);
  const accent = accentForStudio(studio.mal_id);
  const founded = yearOf(studio.established);
  const yearsActive =
    founded && CURRENT_YEAR - founded > 0 ? CURRENT_YEAR - founded : null;

  const scored = (posters || []).filter((p) => Number.isFinite(p?.score));
  const scoreAvg = scored.length
    ? scored.reduce((sum, p) => sum + p.score, 0) / scored.length
    : null;

  const displayPosters = (posters || []).slice(0, 4);

  return (
    <Link href={`/studios/${studio.mal_id}`} className={styles.card}>
      <div className={styles.cardBand} style={{ background: accent.base }} />
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <div
            className={styles.cardLogo}
            style={{
              background: `${accent.base}1f`,
              borderColor: `${accent.base}55`,
              color: accent.ink,
            }}
          >
            {studioInitials(name)}
          </div>
          <div className={styles.cardIdent}>
            <div className={styles.cardName}>{name}</div>
            <div className={styles.cardMeta}>
              {founded ? (
                <>
                  <span className={styles.cardMetaNum}>{founded}</span>
                  {yearsActive ? (
                    <>
                      <span className={styles.dot} />
                      <span className={styles.cardMetaNum}>
                        {t('studios.card.yearsShort', { n: yearsActive })}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <span>{t('studios.card.foundedUnknown')}</span>
              )}
            </div>
          </div>
          <span className={styles.cardBookmark} aria-hidden="true">
            <Bookmark size={12} />
          </span>
        </div>

        {studio.about ? (
          <p className={styles.cardBio}>{shortenBio(studio.about, 150)}</p>
        ) : (
          <p className={styles.cardBioEmpty}>{t('studios.card.bioMissing')}</p>
        )}

        <div className={styles.posterRow}>
          {postersLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className={`${styles.posterSlot} al-skeleton`}
              />
            ))
          ) : (
            <>
              {displayPosters.map((p) => {
                const url = posterUrl(p);
                return (
                  <div key={p.mal_id} className={styles.posterSlot}>
                    {url ? (
                      <Image
                        src={url}
                        alt={p.title || ''}
                        fill
                        sizes="80px"
                        quality={70}
                        className={styles.posterImage}
                      />
                    ) : null}
                  </div>
                );
              })}
              {Array.from({
                length: Math.max(0, 4 - displayPosters.length),
              }).map((_, i) => (
                <div key={`ph-${i}`} className={styles.posterSlotEmpty} />
              ))}
            </>
          )}
        </div>

        <div className={styles.cardStats}>
          <div className={styles.cardStat}>
            <div className={styles.cardStatLabel}>{t('studios.card.productions')}</div>
            <div className={styles.cardStatValue}>{studio.count || 0}</div>
          </div>
          <div className={styles.cardStat}>
            <div className={styles.cardStatLabel}>{t('studios.card.scoreAvg')}</div>
            <div className={`${styles.cardStatValue} ${styles.cardStatScore}`}>
              {scoreAvg !== null && Number.isFinite(scoreAvg)
                ? scoreAvg.toFixed(2)
                : '—'}
            </div>
          </div>
          <div className={styles.cardStat}>
            <div className={styles.cardStatLabel}>{t('studios.card.founded')}</div>
            <div className={styles.cardStatValue}>{founded ?? '—'}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default translate(StudioCard);
