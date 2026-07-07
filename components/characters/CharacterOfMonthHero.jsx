import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { firstSentence, truncateText } from '../../lib/utils/text';
import styles from './CharacterOfMonthHero.module.css';

const QUOTE_MAX = 140;

function CharacterOfMonthHero({ character, animeTitle, animeEpisodes, role, rank, t }) {
  if (!character) return null;

  const poster =
    character?.images?.webp?.large_image_url ||
    character?.images?.jpg?.large_image_url ||
    character?.images?.webp?.image_url ||
    character?.images?.jpg?.image_url ||
    '/logo_no_text.png';
  const rawQuote = character?.about ? firstSentence(character.about) : null;
  const quote = rawQuote ? truncateText(rawQuote, QUOTE_MAX) : null;

  return (
    <Link href={`/characters/${character.mal_id}`} className={styles.hero}>
      <div className={styles.posterCol}>
        <Image
          src={poster}
          alt={character.name || ''}
          fill
          sizes="(max-width: 1100px) 100vw, 360px"
          className={styles.posterImg}
          quality={95}
          priority
        />
        <div className={styles.posterFade} />
      </div>
      <div className={styles.body}>
        <div className={styles.eyebrow}>{t('characters.heroEyebrow')}</div>
        <h2 className={styles.name}>{character.name}</h2>
        {animeTitle ? (
          <div className={styles.from}>
            {t('characters.heroFrom', { title: animeTitle })}
          </div>
        ) : null}
        {quote ? (
          <blockquote className={styles.quote}>
            <span className={styles.quoteText}>“{quote}”</span>
          </blockquote>
        ) : null}
        <div className={styles.stats}>
          {animeEpisodes ? (
            <div className={styles.statCell}>
              <div className={styles.statLabel}>{t('characters.heroStatEpisodes')}</div>
              <div className={styles.statValue}>{animeEpisodes}</div>
            </div>
          ) : null}
          {role ? (
            <div className={styles.statCell}>
              <div className={styles.statLabel}>{t('characters.heroStatRole')}</div>
              <div className={styles.statValue}>
                {role === 'Main'
                  ? t('characters.heroRoleMain')
                  : t('characters.heroRoleSupporting')}
              </div>
            </div>
          ) : null}
          {rank ? (
            <div className={styles.statCell}>
              <div className={styles.statLabel}>{t('characters.heroStatRanking')}</div>
              <div className={`${styles.statValue} ${styles.statValueAccent}`}>#{rank}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default translate(CharacterOfMonthHero);
