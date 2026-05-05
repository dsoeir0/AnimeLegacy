import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import { primaryStudioName } from '../../lib/utils/anime';
import { getAnimeBannerUrl } from '../../lib/utils/media';
import styles from './discover.module.css';

// 2-column editorial hero: one big "staff pick" on the left, two smaller
// cards stacked on the right. Primary uses <Image priority> for above-the-
// fold sharpness; secondary cards also use <Image> so DPR-aware variants
// ship on Retina displays.
function EditorialFeature({ primary, secondary, t }) {
  if (!primary) return null;
  const primaryBanner = primary.banner || getAnimeBannerUrl(primary);
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
            sizes="(max-width: 1100px) 100vw, 60vw"
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
          const banner = a.banner || getAnimeBannerUrl(a);
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
                  sizes="(max-width: 1100px) 100vw, 30vw"
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
