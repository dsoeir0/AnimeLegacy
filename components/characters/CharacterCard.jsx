import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import styles from './CharacterCard.module.css';

const posterFrom = (character) =>
  character?.images?.webp?.image_url ||
  character?.images?.jpg?.image_url ||
  '/logo_no_text.png';

function CharacterCard({ character, t }) {
  const role = character?.role;
  const animeTitle = character?.animeTitle;
  const voice = character?.voiceActor;
  const roleLabel = role
    ? role === 'Main'
      ? t('characters.heroRoleMain')
      : t('characters.heroRoleSupporting')
    : null;
  const roleClass =
    role === 'Main' ? styles.roleBadgeMain : styles.roleBadgeSupporting;

  return (
    <Link href={`/characters/${character.mal_id}`} className={styles.card}>
      <div className={styles.posterWrap}>
        <Image
          src={posterFrom(character)}
          alt={character.name || ''}
          fill
          sizes="(max-width: 1100px) 50vw, 240px"
          className={styles.poster}
        />
        <div className={styles.gradient} />
        {roleLabel ? (
          <div className={`${styles.roleBadge} ${roleClass}`}>
            {roleLabel.toUpperCase()}
          </div>
        ) : null}
      </div>
      <div className={styles.meta}>
        <div className={styles.name}>{character.name}</div>
        {animeTitle ? <div className={styles.anime}>{animeTitle}</div> : null}
        {voice?.name ? (
          <div className={styles.voiceRow}>
            {voice?.image ? (
              <Image
                src={voice.image}
                alt={voice.name || ''}
                width={20}
                height={20}
                className={styles.voiceAvatar}
              />
            ) : (
              <span className={styles.voiceAvatarFallback} aria-hidden="true" />
            )}
            <div className={styles.voiceMeta}>
              <span className={styles.voiceLabel}>{t('characters.voiceLabel')}</span>
              <span className={styles.voiceName}>{voice.name}</span>
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default translate(CharacterCard);
