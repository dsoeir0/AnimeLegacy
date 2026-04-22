import { Pencil, LogOut } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import styles from './profile.module.css';

function ProfileStrip({
  avatar,
  displayName,
  initials,
  profile,
  email,
  joinYear,
  reviewsCount,
  listEntries,
  bio,
  onEdit,
  onSignOut,
  t,
}) {
  return (
    <section className={styles.strip}>
      <div className={styles.stripAvatar}>
        {avatar ? <img src={avatar} alt={displayName} /> : <span>{initials}</span>}
      </div>
      <div className={styles.stripIdent}>
        <div className={styles.stripNameRow}>
          <h1 className={styles.stripName}>{displayName}</h1>
          <span className={styles.stripTier}>{t('profile.eyebrow')}</span>
        </div>
        <div className={styles.stripMeta}>
          {profile?.username ? `@${profile.username}` : email}
          {joinYear ? ` · ${t('profile.joinedYear', { year: joinYear })}` : ''}
          {reviewsCount > 0
            ? ` · ${t('profile.reviewsCount', { n: reviewsCount })}`
            : ''}
          {listEntries > 0
            ? ` · ${t('profile.entriesCount', { n: listEntries })}`
            : ''}
        </div>
        {bio ? <p className={styles.stripBio}>{bio}</p> : null}
      </div>
      <div className={styles.stripActions}>
        <Button variant="secondary" size="md" icon={Pencil} onClick={onEdit}>
          {t('actions.editProfile')}
        </Button>
        <Button variant="ghost" size="md" icon={LogOut} onClick={onSignOut}>
          {t('actions.signOut')}
        </Button>
      </div>
    </section>
  );
}

export default translate(ProfileStrip);
