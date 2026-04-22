import Image from 'next/image';
import Link from 'next/link';
import { Check, Eye, PenTool, Star } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Skeleton, { SkeletonText } from '../ui/Skeleton';
import { formatRelativeTime } from '../../lib/utils/time';
import { deriveVerb } from '../../lib/utils/profileActivity';
import styles from './profile.module.css';

const VERB_LABEL_KEYS = {
  watch: 'profile.verbs.watched',
  complete: 'profile.verbs.completed',
  rate: 'profile.verbs.rated',
  review: 'profile.verbs.reviewed',
};

const VerbIcon = ({ kind, size = 14 }) => {
  if (kind === 'complete') return <Check size={size} strokeWidth={2} />;
  if (kind === 'rate') return <Star size={size} fill="currentColor" strokeWidth={0} />;
  if (kind === 'review') return <PenTool size={size} strokeWidth={2} />;
  return <Eye size={size} strokeWidth={2} />;
};

const ActivityItem = ({ entry, i, t }) => {
  const kind = deriveVerb(entry);
  const posterUrl = entry.posterUrl || '/logo_no_text.png';
  const animeId = entry.animeId;
  const label = entry.label || entry.type || t(VERB_LABEL_KEYS[kind]);
  const inner = (
    <>
      <div className={`${styles.activityVerb} ${styles[`verb_${kind}`]}`}>
        <VerbIcon kind={kind} />
      </div>
      <div className={styles.activityPoster}>
        <Image
          src={posterUrl}
          alt={entry.title || 'Activity'}
          width={48}
          height={68}
          sizes="48px"
          quality={85}
        />
      </div>
      <div className={styles.activityText}>
        <div className={styles.activityTitle}>{entry.title || 'Activity'}</div>
        <div className={styles.activityDesc}>{label}</div>
      </div>
      <div className={styles.activityTime}>
        {formatRelativeTime(entry.createdAt) || ''}
      </div>
    </>
  );
  const key = `${animeId || 'act'}-${i}`;
  return animeId ? (
    <Link key={key} href={`/anime/${animeId}`} className={styles.activityItem}>
      {inner}
    </Link>
  ) : (
    <div key={key} className={styles.activityItem}>
      {inner}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className={styles.activityList}>
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className={styles.activityItem}>
        <div className={styles.activityVerb}>
          <Skeleton width={28} height={28} rounded={8} />
        </div>
        <div className={styles.activityPoster}>
          <Skeleton width={48} height={68} rounded={6} />
        </div>
        <div className={styles.activityText}>
          <SkeletonText lines={2} />
        </div>
      </div>
    ))}
  </div>
);

function ActivityGroups({ groups, loading, t }) {
  if (loading) return <LoadingSkeleton />;
  if (!groups.length) {
    return <div className={styles.emptyInline}>{t('profile.activityEmpty')}</div>;
  }
  return (
    <div className={styles.activityList}>
      {groups.map((group) => (
        <div key={group.key} className={styles.activityDay}>
          <div className={styles.dayLabel}>
            {group.mo}
            <span className={styles.dayDate}>{group.day}</span>
          </div>
          <div className={styles.activityItems}>
            {group.items.map((entry, i) => (
              <ActivityItem key={`${entry.animeId || 'act'}-${i}`} entry={entry} i={i} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default translate(ActivityGroups);
