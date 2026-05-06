import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import { primaryStudioName } from '../../lib/utils/anime';
import styles from './discover.module.css';

function EditorialFeature({ primary, secondary, t }) {
  if (!primary) return null;
  // Only the AniList-enriched bannerImage fits this banner-shaped slot.
  // Falling back to the MAL poster (225×320) here would force `object-fit:
  // cover` to upscale a vertical poster into a wide hero — visually a heavy
  // blur of one character's face.
  const primaryBanner = primary.banner || null;
  return (
    <div className={styles.editorial}>
      <Link
        href={`/anime/${primary.mal_id}`}
        className={styles.editorialPrimary}
      >
        {primaryBanner ? (
          <Image
            src={primaryBanner}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1100px) 90vw, 1280px"
            quality={85}
            priority
            className={styles.editorialBanner}
          />
        ) : null}
        <div className={styles.editorialPrimaryGradient} />
        <div className={styles.editorialPrimaryInner}>
          <div className={styles.editorialTopRow}>
            <span className={styles.editorialTopEyebrow}>
              {t('discoverPage.editorial.primaryEyebrow')}
            </span>
            <span className={styles.editorialTopDot} aria-hidden="true" />
            <span className={styles.editorialTopMeta}>
              {primary.year ?? primary?.aired?.prop?.from?.year ?? '—'}
              {typeof primary.score === 'number' ? ` · ★ ${primary.score.toFixed(2)}` : ''}
            </span>
          </div>
          <div className={styles.editorialBody}>
            <div className={styles.editorialEyebrow}>
              {[primaryStudioName(primary), primary.year].filter(Boolean).join(' · ')}
            </div>
            <h2 className={styles.editorialTitle}>{primary.title || 'Untitled'}</h2>
            {primary.synopsis ? (
              <p className={styles.editorialSynopsis}>{primary.synopsis}</p>
            ) : null}
            <div>
              <Button variant="primary" size="md" iconRight={ArrowRight}>
                {t('discoverPage.editorial.primaryCta')}
              </Button>
            </div>
          </div>
        </div>
      </Link>

      <div className={styles.editorialSecondary}>
        {secondary.slice(0, 2).map((a, i) => {
          const banner = a.banner || null;
          return (
            <Link
              key={a.mal_id}
              href={`/anime/${a.mal_id}`}
              className={styles.editorialSecondaryCard}
            >
              {banner ? (
                <Image
                  src={banner}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 480px"
                  className={styles.editorialSecondaryImage}
                  loading="lazy"
                />
              ) : null}
              <div className={styles.editorialSecondaryGradient} />
              <div className={styles.editorialSecondaryInner}>
                <div className={styles.editorialSecondaryEyebrow}>
                  {i === 0
                    ? t('discoverPage.editorial.secondaryEyebrowA')
                    : t('discoverPage.editorial.secondaryEyebrowB')}
                </div>
                <div className={styles.editorialSecondaryTitle}>
                  {a.title || 'Untitled'}
                </div>
                <div className={styles.editorialSecondaryMeta}>
                  {primaryStudioName(a) ? <span>{primaryStudioName(a)}</span> : null}
                  {primaryStudioName(a) && a.year ? (
                    <span className={styles.metaDot} aria-hidden="true" />
                  ) : null}
                  {a.year ? <span>{a.year}</span> : null}
                  {typeof a.score === 'number' ? (
                    <>
                      <span className={styles.metaDot} aria-hidden="true" />
                      <span>★ {a.score.toFixed(2)}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default translate(EditorialFeature);
