import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { getAnimeThumbUrl } from '../../lib/utils/media';
import { DISCOVER_MOODS } from './moods';
import styles from './discover.module.css';

// 6 curated mood cards. Clicking navigates to /search pre-filtered with
// the mood's Jikan genre query — see `moods.js` for the taxonomy.
// `postersByMood` is a { [moodId]: [anime, anime, anime] } map computed
// in getServerSideProps so the poster stack is pre-populated at SSR.
function MoodGrid({ postersByMood, t }) {
  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>
            {t('discoverPage.moods.eyebrow')}
          </div>
          <h2 className={styles.sectionTitle}>
            {t('discoverPage.moods.heading')}
          </h2>
        </div>
      </div>
      <div className={styles.moodGrid}>
        {DISCOVER_MOODS.map((mood) => {
          const posters = postersByMood?.[mood.id] || [];
          return (
            <Link
              key={mood.id}
              href={`/search?mood=${mood.id}`}
              className={styles.moodCard}
            >
              <div
                className={styles.moodTint}
                style={{
                  background: `radial-gradient(circle at top right, ${mood.accent}33, transparent 70%)`,
                }}
              />
              <div className={styles.moodBody}>
                <div
                  className={styles.moodSwatch}
                  style={{ background: mood.accent }}
                />
                <div className={styles.moodLabel}>{t(mood.labelKey)}</div>
                <div className={styles.moodSub}>{t(mood.subKey)}</div>
              </div>
              <div className={styles.moodPosters} aria-hidden="true">
                {posters.slice(0, 3).map((a, i) => {
                  const url = getAnimeThumbUrl(a);
                  return (
                    <div
                      key={a.mal_id}
                      className={styles.moodPoster}
                      style={{ left: `${i * 28}px`, zIndex: 3 - i }}
                    >
                      {url ? (
                        <Image
                          src={url}
                          alt=""
                          fill
                          sizes="80px"
                          className={styles.moodPosterImg}
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default translate(MoodGrid);
