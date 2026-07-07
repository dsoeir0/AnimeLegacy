import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import IconButton from '../ui/IconButton';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { flattenAiringList } from '../../lib/utils/airingThisWeek';
import styles from './discover.module.css';

const MAX = 14;

function AiringThisWeek({ schedulesByDay: ssrSchedules, t }) {
  const [schedulesByDay, setSchedulesByDay] = useState(ssrSchedules || null);
  const [items, setItems] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (schedulesByDay || ssrSchedules) return undefined;
    let cancelled = false;
    fetch('/api/schedules')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.schedulesByDay) return null;
        setSchedulesByDay(data.schedulesByDay);
        return null;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [schedulesByDay, ssrSchedules]);

  useEffect(() => {
    setItems(flattenAiringList(schedulesByDay, new Date()).slice(0, MAX));
  }, [schedulesByDay]);

  const dayFormatter = useMemo(() => {
    if (typeof Intl === 'undefined') return null;
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    } catch {
      return null;
    }
  }, []);

  const dayLabel = (daysFromToday) => {
    if (daysFromToday === 0) return t('discoverPage.airingThisWeek.today');
    if (daysFromToday === 1) return t('discoverPage.airingThisWeek.tomorrow');
    if (!dayFormatter) return '';
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    return dayFormatter.format(d);
  };

  const scroll = (dir) =>
    scrollRef.current?.scrollBy({ left: dir * 520, behavior: 'smooth' });

  if (items.length === 0) return null;

  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>
            {t('discoverPage.airingThisWeek.eyebrow')}
          </div>
          <h2 className={styles.sectionTitle}>
            {t('discoverPage.airingThisWeek.heading')}
          </h2>
        </div>
        <div className={styles.airingControls}>
          <IconButton icon={ChevronLeft} onClick={() => scroll(-1)} />
          <IconButton icon={ChevronRight} onClick={() => scroll(1)} />
        </div>
      </div>
      <div ref={scrollRef} className={styles.airingRail}>
        {items.map(({ anime, localTime, daysFromToday }) => {
          const url = getAnimeImageUrl(anime);
          const isToday = daysFromToday === 0;
          return (
            <Link
              key={`${anime.mal_id}-${localTime}`}
              href={`/anime/${anime.mal_id}`}
              className={styles.airingCard}
            >
              <div className={styles.airingPoster}>
                {url ? (
                  <Image
                    src={url}
                    alt={anime.title || ''}
                    fill
                    sizes="170px"
                    className={styles.airingPosterImg}
                    loading="lazy"
                  />
                ) : null}
                <div className={styles.airingGradient} />
                <div
                  className={`${styles.airingBadge} ${isToday ? styles.airingBadgeToday : ''}`}
                >
                  <span className={styles.airingBadgeDay}>
                    {dayLabel(daysFromToday)}
                  </span>
                  <span className={styles.airingBadgeTime}>{localTime}</span>
                </div>
              </div>
              <div className={styles.airingTitle}>
                {anime.title || 'Untitled'}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default translate(memo(AiringThisWeek));
