import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { getAnimeThumbUrl } from '../../lib/utils/media';
import { rankByVibe } from '../../lib/utils/vibeFinder';
import styles from './discover.module.css';

function VibeFinder({ pool, t }) {
  const [pace, setPace] = useState(35);
  const [tone, setTone] = useState(50);
  const [length, setLength] = useState(60);

  const target = { pace, tone, length };
  const matches = useMemo(
    () => (pool?.length ? rankByVibe(pool, target, 4) : []),
    // Intentionally not memoising on `target` object identity — primitives
    // cover the dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, pace, tone, length],
  );

  const renderSlider = (label, leftLabel, rightLabel, value, setValue) => (
    <div>
      <div className={styles.vibeSliderHead}>
        <span className={styles.vibeSliderLabel}>{label}</span>
        <span className={styles.vibeSliderValue}>{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className={styles.vibeSlider}
      />
      <div className={styles.vibeSliderAxis}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>
            {t('discoverPage.vibe.eyebrow')}
          </div>
          <h2 className={styles.sectionTitle}>
            {t('discoverPage.vibe.heading')}
          </h2>
        </div>
      </div>
      <div className={styles.vibeCard}>
        <div className={styles.vibeControls}>
          {renderSlider(
            t('discoverPage.vibe.pace'),
            t('discoverPage.vibe.paceLeft'),
            t('discoverPage.vibe.paceRight'),
            pace,
            setPace,
          )}
          {renderSlider(
            t('discoverPage.vibe.tone'),
            t('discoverPage.vibe.toneLeft'),
            t('discoverPage.vibe.toneRight'),
            tone,
            setTone,
          )}
          {renderSlider(
            t('discoverPage.vibe.length'),
            t('discoverPage.vibe.lengthLeft'),
            t('discoverPage.vibe.lengthRight'),
            length,
            setLength,
          )}
          <div className={styles.vibeHint}>{t('discoverPage.vibe.hint')}</div>
        </div>
        <div>
          <div className={styles.sectionEyebrow} style={{ marginBottom: 14 }}>
            {t('discoverPage.vibe.matchesEyebrow')}
          </div>
          <div className={styles.vibeMatches}>
            {matches.map(({ anime, match }) => {
              const url = getAnimeThumbUrl(anime);
              const genres = Array.isArray(anime.genres)
                ? anime.genres
                    .map((g) => (typeof g === 'string' ? g : g?.name))
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(' · ')
                : '';
              return (
                <Link
                  key={anime.mal_id}
                  href={`/anime/${anime.mal_id}`}
                  className={styles.vibeMatchCard}
                >
                  <div className={styles.vibeMatchPoster}>
                    {url ? (
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="64px"
                        className={styles.vibeMatchImg}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className={styles.vibeMatchBody}>
                    <div className={styles.vibeMatchTitle}>
                      {anime.title || 'Untitled'}
                    </div>
                    {genres ? (
                      <div className={styles.vibeMatchGenres}>{genres}</div>
                    ) : null}
                  </div>
                  <div className={styles.vibeMatchScore}>
                    <div className={styles.vibeMatchScoreValue}>{match}</div>
                    <div className={styles.vibeMatchScoreLabel}>
                      {t('discoverPage.vibe.matchLabel')}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default translate(VibeFinder);
