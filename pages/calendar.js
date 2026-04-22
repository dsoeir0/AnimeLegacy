import { Fragment, useEffect, useMemo, useState } from 'react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import CalendarCell from '../components/calendar/CalendarCell';
import useMyList from '../hooks/useMyList';
import { getSchedules } from '../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../lib/utils/anime';
import { jstToLocalSlot } from '../lib/utils/time';
import styles from './calendar.module.css';

const DAYS = [
  { key: 'monday', labelKey: 'calendar.days.monday' },
  { key: 'tuesday', labelKey: 'calendar.days.tuesday' },
  { key: 'wednesday', labelKey: 'calendar.days.wednesday' },
  { key: 'thursday', labelKey: 'calendar.days.thursday' },
  { key: 'friday', labelKey: 'calendar.days.friday' },
  { key: 'saturday', labelKey: 'calendar.days.saturday' },
  { key: 'sunday', labelKey: 'calendar.days.sunday' },
];

const mondayOfWeek = (today) => {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const js = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + offset);
  return d;
};

const weekDates = (today = new Date()) => {
  const monday = mondayOfWeek(today);
  return DAYS.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { key: day.key, labelKey: day.labelKey, date: d };
  });
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Group raw schedules by local-day + local-hour. Returns { slots, hours,
// countsByDay, timeByJst } where `slots` is a Map keyed by
// `${localDayKey}:${hour}` of entries (sorted by local minute) and `hours`
// is the sorted array of distinct hours that actually hold entries.
const bucketize = (schedulesByDay) => {
  const slots = new Map();
  const countsByDay = Object.fromEntries(DAYS.map((d) => [d.key, 0]));
  const timeByJst = new Map();
  const hourSet = new Set();

  for (let jstIdx = 0; jstIdx < DAYS.length; jstIdx += 1) {
    const items = schedulesByDay?.[DAYS[jstIdx].key] || [];
    for (const item of items) {
      const jstTime = item?.broadcast?.time;
      const slot = jstToLocalSlot(jstIdx, jstTime);
      if (!slot) continue;
      const localDayKey = DAYS[slot.dayIdx].key;
      const key = `${localDayKey}:${slot.hour}`;
      if (!slots.has(key)) slots.set(key, []);
      slots.get(key).push({ item, minute: slot.minute, localTime: slot.display });
      countsByDay[localDayKey] += 1;
      hourSet.add(slot.hour);
      if (jstTime) timeByJst.set(jstTime, slot.display);
    }
  }

  for (const entries of slots.values()) {
    entries.sort((a, b) => a.minute - b.minute);
  }

  const hours = Array.from(hourSet).sort((a, b) => a - b);
  return { slots, hours, countsByDay, timeByJst };
};

function CalendarPage({ schedulesByDay, t }) {
  const { list: userList } = useMyList();
  const [now, setNow] = useState(() => new Date());
  const [bucket, setBucket] = useState(null);

  // SSR cannot know the viewer's timezone, so we rebucket on the client
  // after hydration. Until then we render the timetable shell only.
  useEffect(() => {
    setNow(new Date());
    setBucket(bucketize(schedulesByDay));
  }, [schedulesByDay]);

  const week = useMemo(() => weekDates(now), [now]);
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
            const isToday = isSameDay(date, now);
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
                    const isToday = isSameDay(date, now);
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
      DAYS.map((day) => getSchedules(day.key).then((res) => [day.key, res])),
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
