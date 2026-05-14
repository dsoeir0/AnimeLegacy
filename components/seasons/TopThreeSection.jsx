import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import styles from './TopThreeSection.module.css';

function TopThreeSection({ items, aniListMap, t }) {
  if (!items || items.length === 0) return null;
  return (
    <section className={styles.topThree}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>{t('seasonsPage.topThree.eyebrow')}</div>
          <h2 className={styles.sectionTitle}>{t('seasonsPage.topThree.title')}</h2>
        </div>
      </div>
      <div className={styles.topThreeGrid}>
        {items.map((item, idx) => {
          const banner = getAnimeImageUrl(item, aniListMap?.[item.mal_id]);
          const studio = item.studios?.[0]?.name || '—';
          return (
            <Link
              key={item.mal_id}
              href={`/anime/${item.mal_id}`}
              className={styles.topThreeCard}
            >
              <div className={styles.topThreeBanner}>
                {banner ? (
                  <Image
                    src={banner}
                    alt={item.title || ''}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 420px"
                    quality={90}
                    className={styles.topThreeImg}
                  />
                ) : null}
                <div className={styles.topThreeGradient} />
                <div className={styles.topThreeRank}>
                  {String(idx + 1).padStart(2, '0')}
                </div>
              </div>
              <div className={styles.topThreeBody}>
                <div className={styles.topThreeMeta}>
                  <span>{studio}</span>
                  {item.year ? (
                    <>
                      <span>·</span>
                      <span>{item.year}</span>
                    </>
                  ) : null}
                </div>
                <div className={styles.topThreeTitle}>{item.title}</div>
                {Number(item?.score) > 0 ? (
                  <div className={styles.topThreeScore}>
                    ★ {Number(item.score).toFixed(2)}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default translate(TopThreeSection);
