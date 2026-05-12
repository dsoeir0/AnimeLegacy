import Link from 'next/link';
import { useMemo } from 'react';
import { Eye, Star, CheckCircle2, BookOpen } from 'lucide-react';
import { getLanguage, translate } from 'react-switch-lang';
import { formatRelativeTime } from '../../lib/utils/time';
import { classifyAnimeFormat } from '../../lib/utils/anime';
import { deriveVerb, formatMonthAbbr, toJsDate } from '../../lib/utils/profileActivity';
import styles from './profile.module.css';

const ICONS = {
  watch: Eye,
  rate: Star,
  complete: CheckCircle2,
  review: BookOpen,
};

function ActivityTimeline({ groups, total, animeItems, t }) {
  const animeById = useMemo(() => {
    const map = new Map();
    (animeItems || []).forEach((item) => {
      const id = String(item?.animeId ?? item?.id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [animeItems]);

  if (!groups || groups.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.distroHead}>
          <h3 className={styles.sectionTitle}>{t('profile.fullLog')}</h3>
        </div>
        <div className={styles.emptyInline}>{t('profile.activityEmpty')}</div>
      </div>
    );
  }

  const lang = getLanguage();
  return (
    <div className={styles.section}>
      <div className={styles.distroHead}>
        <h3 className={styles.sectionTitle}>{t('profile.fullLog')}</h3>
        <span className={styles.kicker}>{t('profile.fullLogMeta', { n: total })}</span>
      </div>
      <div className={styles.timeline}>
        {groups.map((group) => (
          <div key={group.key} className={styles.timelineGroup}>
            <div className={styles.timelineDate}>
              <span className={styles.timelineMonth}>{formatMonthAbbr(group.monthIndex, lang)}</span>
              <span className={styles.timelineDay}>{group.day}</span>
            </div>
            <div className={styles.timelineItems}>
              {group.items.map((entry, idx) => {
                const verb = deriveVerb(entry);
                const Icon = ICONS[verb] || Eye;
                const date = toJsDate(entry.createdAt);
                const id = entry.animeId;
                const animeFromList = id ? animeById.get(String(id)) : null;
                const fmt = classifyAnimeFormat(animeFromList || entry);
                const rowBody = (
                  <>
                    <span className={`${styles.timelineIcon} ${styles[`timelineIcon_${verb}`]}`}>
                      <Icon size={14} strokeWidth={2.4} />
                    </span>
                    <span className={`${styles.timelineFormatTag} ${styles[`timelineFormatTag_${fmt.key}`]} ${styles.timelineFormatTagDesktop}`}>
                      {fmt.label}
                    </span>
                    <span className={styles.timelineBody}>
                      <span className={`${styles.timelineFormatTag} ${styles[`timelineFormatTag_${fmt.key}`]} ${styles.timelineFormatTagMobile}`}>
                        {fmt.label}
                      </span>
                      <span className={styles.timelineTitle}>{entry.title || t('status.unknown')}</span>
                      <span className={styles.timelineLabel}>{entry.label || verb}</span>
                    </span>
                    {date ? (
                      <span className={styles.timelineAgo}>{formatRelativeTime(date)}</span>
                    ) : null}
                  </>
                );
                const key = `${group.key}-${idx}`;
                return id ? (
                  <Link key={key} href={`/anime/${id}`} className={styles.timelineItem}>
                    {rowBody}
                  </Link>
                ) : (
                  <div key={key} className={styles.timelineItem}>
                    {rowBody}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default translate(ActivityTimeline);
