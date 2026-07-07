import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Shuffle } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { getAnimeBannerUrl, getAnimeThumbUrl } from '../../lib/utils/media';
import {
  pickUniqueBanners,
  truncateTitleList,
} from '../../lib/utils/discoverRecs';
import { DISCOVER_MOODS, VISIBLE_MOODS, fisherYatesPick } from './moods';
import styles from './discover.module.css';

function MoodGrid({ postersByMood, t }) {
  const [moods, setMoods] = useState(() => DISCOVER_MOODS.slice(0, VISIBLE_MOODS));

  const shuffle = () => setMoods(fisherYatesPick(DISCOVER_MOODS, VISIBLE_MOODS));

  const bannersByMood = useMemo(
    () => pickUniqueBanners(moods, postersByMood),
    [moods, postersByMood],
  );

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
        <button
          type="button"
          onClick={shuffle}
          className={styles.moodShuffle}
        >
          <Shuffle size={14} strokeWidth={2.2} />
          <span>{t('discoverPage.moods.shuffle')}</span>
        </button>
      </div>
      <div className={styles.moodGrid}>
        {moods.map((mood) => {
          const posters = postersByMood?.[mood.id] || [];
          const bannerAnime = bannersByMood[mood.id];
          const banner = bannerAnime ? getAnimeBannerUrl(bannerAnime) : null;
          const titlesText = truncateTitleList(posters);
          return (
            <Link
              key={mood.id}
              href={`/search?mood=${mood.id}`}
              className={styles.moodCard}
            >
              {banner ? (
                <div className={styles.moodBannerWrap}>
                  <Image
                    src={banner}
                    alt={bannerAnime?.title || ''}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={styles.moodBanner}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div
                  className={styles.moodBannerFallback}
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${mood.accent}33, transparent 70%), var(--al-ink-3)`,
                  }}
                />
              )}
              <div className={styles.moodOverlay} />
              <div className={styles.moodTopRow}>
                <span
                  className={styles.moodDot}
                  style={{ background: mood.accent }}
                  aria-hidden="true"
                />
                <ArrowUpRight
                  size={18}
                  strokeWidth={2}
                  className={styles.moodArrow}
                  aria-hidden="true"
                />
              </div>
              <div className={styles.moodContent}>
                <div className={styles.moodLabel}>{t(mood.labelKey)}</div>
                <div className={styles.moodSub}>{t(mood.subKey)}</div>
                {posters.length > 0 ? (
                  <div className={styles.moodFooter}>
                    <div className={styles.moodAvatars}>
                      {posters.slice(0, 3).map((a, i) => {
                        const url = getAnimeThumbUrl(a);
                        return (
                          <div
                            key={a.mal_id}
                            className={styles.moodAvatar}
                            style={{ left: `${i * 18}px`, zIndex: 3 - i }}
                          >
                            {url ? (
                              <Image
                                src={url}
                                alt={a.title || ''}
                                fill
                                sizes="28px"
                                className={styles.moodAvatarImg}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <span className={styles.moodTitlesText}>{titlesText}</span>
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default translate(memo(MoodGrid));
