import { Fragment, useEffect, useMemo, useState } from 'react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import CalendarCell from '../components/calendar/CalendarCell';
import useMyList from '../hooks/useMyList';
import { getSchedules } from '../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../lib/utils/anime';
import { WEEKDAY_KEYS, isSameCalendarDay, weekdayDates } from '../lib/utils/time';
import { bucketizeSchedule } from '../lib/utils/calendarSchedule';
import styles from './calendar.module.css';

// UI-facing day list (label keys for translation). Index matches
// `WEEKDAY_KEYS` so day arrays stay in sync with bucketizing.
const DAY_LABELS = WEEKDAY_KEYS.map((key) => ({
  key,
  labelKey: `calendar.days.${key}`,
}));

function CalendarPage({ schedulesByDay, t }) {
  const { list: userList } = useMyList();
  const [now, setNow] = useState(() => new Date());
  const [bucket, setBucket] = useState(null);

  // SSR cannot know the viewer's timezone, so we rebucket on the client
  // after hydration. Until then we render the timetable shell only.
  useEffect(() => {
    setNow(new Date());
    setBucket(bucketizeSchedule(schedulesByDay));
  }, [schedulesByDay]);

  const week = useMemo(() => {
    const dates = weekdayDates(now);
    return dates.map((d, i) => ({ ...d, labelKey: DAY_LABELS[i].labelKey }));
  }, [now]);
  const hours = bucket?.hours || [];
  const slots = bucket?.slots || new Map();
  const countsByDay = bucket?.countsByDay || {};

  const totalCount = useMemo(
    () =>
      Object.values(schedulesByDay || {}).reduce(
        (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
        0,
      ),
    [schedulesByDay],
  );

  const myListIds = useMemo(
    () => new Set((userList || []).map((entry) => String(entry.id))),
    [userList],
  );

  return (
    <Layout title={t('calendar.metaTitle')} description={t('calendar.metaDesc')}>
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>{t('calendar.eyebrow')}</div>
          <h1 className={styles.heading}>
            {t('calendar.titleStart')}{' '}
            <span className={styles.headingGrad}>{t('calendar.titleEnd')}</span>
          </h1>
          <p className={styles.subtitle}>
            {totalCount ? t('calendar.countBody', { n: totalCount }) : t('calendar.unavailable')}
          </p>
        </header>

        <div className={styles.timetableEyebrow}>
          {t('calendar.scheduleEyebrow', { n: totalCount })}
        </div>

        <div
          className={styles.grid}
          role="grid"
          aria-label={t('calendar.title')}
        >
          <div className={styles.cornerCell} />

          {week.map(({ key, labelKey, date }) => {
            const isToday = isSameCalendarDay(date, now);
            const count = countsByDay[key] || 0;
            return (
              <div
                key={key}
                className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}
              >
                <div className={styles.dayHeaderLabel}>
                  {t(labelKey).slice(0, 3).toUpperCase()}
                </div>
                <div className={styles.dayHeaderDate}>
                  {date.getDate()}
                  {isToday ? <span className={styles.dayHeaderDot} /> : null}
                </div>
                <div className={styles.dayHeaderCount}>
                  {t('calendar.epShort', { n: count })}
                </div>
              </div>
            );
          })}

          {bucket && hours.length > 0
            ? hours.map((h) => (
                <Fragment key={h}>
                  <div className={styles.hourLabel}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                  {week.map(({ key, date }) => {
                    const isToday = isSameCalendarDay(date, now);
                    const entries = slots.get(`${key}:${h}`) || [];
                    return (
                      <div
                        key={`${h}-${key}`}
                        className={`${styles.slot} ${
                          entries.length ? '' : styles.slotEmpty
                        } ${isToday ? styles.slotToday : ''}`}
                      >
                        {entries.map(({ item, localTime }) => (
                          <CalendarCell
                            key={item.mal_id}
                            anime={item}
                            broadcastTime={item?.broadcast?.time || null}
                            localTime={localTime}
                            inList={myListIds.has(String(item.mal_id))}
                          />
                        ))}
                      </div>
                    );
                  })}
                </Fragment>
              ))
            : (
                <div className={styles.gridEmpty}>
                  {bucket ? t('calendar.unavailable') : t('calendar.loading')}
                </div>
              )}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} /> {t('calendar.legendMine')}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSquare} /> {t('calendar.legendOthers')}
          </span>
          <span className={styles.legendNote}>{t('calendar.tzNote')}</span>
        </div>
      </div>
    </Layout>
  );
}

export default translate(CalendarPage);

const pickScheduleFields = (item) => ({
  mal_id: item?.mal_id ?? null,
  title: item?.title ?? null,
  images: {
    webp: {
      image_url: item?.images?.webp?.image_url ?? null,
      large_image_url: item?.images?.webp?.large_image_url ?? null,
    },
    jpg: {
      image_url: item?.images?.jpg?.image_url ?? null,
      large_image_url: item?.images?.jpg?.large_image_url ?? null,
    },
  },
  broadcast: item?.broadcast?.time ? { time: item.broadcast.time } : null,
});

export async function getServerSideProps() {
  try {
    const entries = await Promise.all(
      WEEKDAY_KEYS.map((key) => getSchedules(key).then((res) => [key, res])),
    );
    const schedulesByDay = Object.fromEntries(
      entries.map(([key, res]) => [
        key,
        Array.isArray(res?.data)
          ? dedupeByMalId(filterOutHentai(res.data)).map(pickScheduleFields)
          : [],
      ]),
    );
    return { props: { schedulesByDay } };
  } catch {
    return { props: { schedulesByDay: {} } };
  }
}
