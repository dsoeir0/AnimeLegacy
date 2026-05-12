import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import styles from './MobileCharacters.module.css';

const posterFrom = (character) =>
  character?.images?.webp?.image_url ||
  character?.images?.jpg?.image_url ||
  null;

const cleanBio = (about, max = 140) => {
  if (typeof about !== 'string') return '';
  const cleaned = about.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max);
  const cut = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, cut > 80 ? cut : max)}…`;
};

function MobileCharacters({ items, totalIndexed, t }) {
  const featured = items[0];
  const rest = items.slice(1);
  const featuredFans = Number.isFinite(featured?.favorites) ? featured.favorites : 0;

  return (
    <div className={styles.mobileCharacters}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t('characters.mobileEyebrow')}</span>
        <h1 className={styles.title}>{t('characters.mobileTitle')}</h1>
        <div className={styles.stats}>
          <span>{t('characters.mobileStatsIndexed', { n: totalIndexed.toLocaleString() })}</span>
          <span className={styles.statsDot} />
          <span>{t('characters.mobileStatsShown', { n: items.length })}</span>
        </div>
      </header>

      {featured ? (
        <Link href={`/characters/${featured.mal_id}`} className={styles.feature}>
          <div className={styles.featureBg}>
            {posterFrom(featured) ? (
              <Image
                src={posterFrom(featured)}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                priority
              />
            ) : null}
            <div className={styles.featureGradient} />
          </div>
          <div className={styles.featureContent}>
            <span className={styles.featureBadge}>
              {t('characters.mobileFanFavorite')}
              {featuredFans > 0 ? (
                <>
                  <span className={styles.featureBadgeDot} />
                  {t('characters.mobileLikesCount', { n: featuredFans.toLocaleString() })}
                </>
              ) : null}
            </span>
            <h2 className={styles.featureName}>{featured.name || t('status.unknown')}</h2>
            {featured.about ? (
              <p className={styles.featureBio}>{cleanBio(featured.about, 140)}</p>
            ) : null}
          </div>
        </Link>
      ) : null}

      {rest.length > 0 ? (
        <section className={styles.grid}>
          <div className={styles.gridHead}>
            <h2 className={styles.gridTitle}>{t('characters.mobileTopTitle')}</h2>
            <span className={styles.gridCount}>
              {t('characters.mobileResultsCount', { n: rest.length })}
            </span>
          </div>
          <div className={styles.gridBody}>
            {rest.map((c) => {
              const poster = posterFrom(c);
              const fans = Number.isFinite(c?.favorites) ? c.favorites : 0;
              return (
                <Link
                  key={c.mal_id}
                  href={`/characters/${c.mal_id}`}
                  className={styles.tile}
                >
                  <span className={styles.tilePoster}>
                    {poster ? (
                      <Image
                        src={poster}
                        alt={c.name || ''}
                        fill
                        sizes="(max-width: 768px) 33vw, 140px"
                      />
                    ) : null}
                    <span className={styles.tileGradient} />
                  </span>
                  <span className={styles.tileBody}>
                    <span className={styles.tileName}>{c.name || t('status.unknown')}</span>
                    {fans > 0 ? (
                      <span className={styles.tileFans}>
                        {t('characters.mobileFansCount', { n: fans.toLocaleString() })}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default translate(MobileCharacters);
