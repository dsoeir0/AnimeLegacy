import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { primaryStudioName } from '../../lib/utils/anime';
import { getAnimeBannerUrl } from '../../lib/utils/media';
import styles from './discover.module.css';

// "Hidden gems" rail. Fed a pre-ranked pool from SSR — typically anime
// with score ≥ 8.0 and popularity rank > threshold (less watched but well
// rated). No extra Jikan calls needed at render time.
function HiddenGems({ gems, t }) {
  if (!gems || !gems.length) return null;
  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={`${styles.sectionEyebrow} ${styles.sectionEyebrowWarm}`}>
            {t('discoverPage.gems.eyebrow')}
          </div>
          <h2 className={styles.sectionTitle}>
            {t('discoverPage.gems.heading')}
          </h2>
        </div>
      </div>
      <div className={styles.gemsGrid}>
        {gems.map((a) => {
          const url = getAnimeBannerUrl(a);
          return (
            <Link
              key={a.mal_id}
              href={`/anime/${a.mal_id}`}
              className={styles.gemCard}
            >
              <div className={styles.gemBanner}>
                {url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={url}
                    alt=""
                    className={styles.gemBannerImg}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div className={styles.gemBannerGradient} />
                {typeof a.score === 'number' ? (
                  <div className={styles.gemScore}>★ {a.score.toFixed(2)}</div>
                ) : null}
              </div>
              <div className={styles.gemBody}>
                <div className={styles.gemTitle}>{a.title || 'Untitled'}</div>
                {a.synopsis ? (
                  <div className={styles.gemSynopsis}>
                    {a.synopsis.replace(/\s+/g, ' ').slice(0, 120)}
                  </div>
                ) : null}
                <div className={styles.gemFooter}>
                  <span className={styles.gemFooterStudio}>
                    {primaryStudioName(a) || (a.year ? String(a.year) : '—')}
                  </span>
                  <span className={styles.gemFooterRank}>
                    {Number.isFinite(a.rank) ? `#${a.rank}` : '—'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default translate(HiddenGems);
