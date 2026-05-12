import Image from 'next/image';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useRouter } from 'next/router';
import { translate } from 'react-switch-lang';
import styles from './MobileProfileHeader.module.css';

function StatCell({ label, value, sub, accent }) {
  return (
    <div className={styles.statCell}>
      <div className={styles.statLabel}>{label}</div>
      <div className={`${styles.statValue} ${accent ? styles.statValueAccent : ''}`}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

function MobileProfileHeader({
  avatar,
  initials,
  displayName,
  handle,
  joinYear,
  bio,
  stats,
  reviewsCount,
  mean,
  onEdit,
  t,
}) {
  const router = useRouter();
  const watched = stats?.watchedCount ?? 0;
  const days = stats?.daysSpent ? Math.round(stats.daysSpent) : 0;
  const meanStr = mean !== null && mean !== undefined ? mean.toFixed(1) : '—';

  return (
    <div className={styles.mobileProfile}>
      <div className={styles.banner} aria-hidden="true">
        <div className={styles.bannerGradient} />
        <div className={styles.bannerFade} />
      </div>

      <div className={styles.topActions}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={t('actions.back')}
          onClick={() => router.back()}
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
        </button>
      </div>

      <div className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">
          {avatar ? (
            <Image src={avatar} alt={displayName} width={86} height={86} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={styles.identityBody}>
          <h1 className={styles.name}>{displayName}</h1>
          <div className={styles.handle}>
            {handle ? `@${handle}` : ''}
            {handle && joinYear ? ' · ' : ''}
            {joinYear ? t('profile.joinedYear', { year: joinYear }) : ''}
          </div>
        </div>
      </div>

      {bio ? <p className={styles.bio}>{bio}</p> : null}

      <div className={styles.actionsRow}>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          <Pencil size={14} strokeWidth={2.2} />
          {t('profile.editCta')}
        </button>
      </div>

      <div className={styles.statsCard}>
        <div className={styles.statsGrid}>
          <StatCell
            label={t('profile.mobileStatAnime')}
            value={watched.toLocaleString()}
            sub={t('profile.mobileStatAnimeSub')}
          />
          <StatCell
            label={t('profile.mobileStatReviews')}
            value={reviewsCount.toLocaleString()}
            sub={t('profile.mobileStatReviewsSub')}
          />
          <StatCell
            label={t('profile.mobileStatDays')}
            value={days.toLocaleString()}
            sub={t('profile.mobileStatDaysSub')}
            accent
          />
          <StatCell
            label={t('profile.mobileStatMean')}
            value={meanStr}
            sub={t('profile.mobileStatMeanSub')}
            accent
          />
        </div>
      </div>
    </div>
  );
}

export default translate(MobileProfileHeader);
