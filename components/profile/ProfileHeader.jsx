import Image from 'next/image';
import { Pencil, Sparkles } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import styles from './profile.module.css';

function ProfileHeader({
  avatar,
  initials,
  displayName,
  handle,
  joinYear,
  reviewsCount,
  listEntries,
  bio,
  onEdit,
  t,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerAvatar} aria-hidden="true">
          {avatar ? (
            <Image src={avatar} alt={displayName} width={72} height={72} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={styles.headerIdent}>
          <div className={styles.headerNameRow}>
            <h1 className={styles.headerName}>{displayName}</h1>
          </div>
          <div className={styles.headerMeta}>
            {handle ? <span>@{handle}</span> : null}
            {joinYear ? (
              <>
                <span className={styles.headerMetaDot} />
                <span>{t('profile.joinedYear', { year: joinYear })}</span>
              </>
            ) : null}
            <span className={styles.headerMetaDot} />
            <span>{t('profile.reviewsCount', { n: reviewsCount })}</span>
            <span className={styles.headerMetaDot} />
            <span>{t('profile.listEntriesCount', { n: listEntries })}</span>
          </div>
          {bio ? <p className={styles.headerBio}>{bio}</p> : null}
        </div>
      </div>
      <div className={styles.headerActions}>
        <Button variant="secondary" size="sm" icon={Pencil} onClick={onEdit}>
          {t('profile.editCta')}
        </Button>
        <span
          className={styles.headerComingSoon}
          title={t('profile.yearInReviewSoon')}
        >
          <Sparkles size={14} strokeWidth={2.2} />
          {t('profile.yearInReview')}
          <span className={styles.headerComingSoonTag}>{t('profile.comingSoonTag')}</span>
        </span>
      </div>
    </header>
  );
}

export default translate(ProfileHeader);
