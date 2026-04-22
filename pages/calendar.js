import { useMemo } from 'react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import CalendarCell from '../components/calendar/CalendarCell';
import { getSchedules } from '../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../lib/utils/anime';
import { formatSeasonLabel, getSeasonFromDate } from '../lib/utils/season';
import styles from './calendar.module.css';

const DAYS = [
  { key: 'monday', labelKey: 'calendar.days.monday', short: 'MON' },
  { key: 'tuesday', labelKey: 'calendar.days.tuesday', short: 'TUE' },
  { key: 'wednesday', labelKey: 'calendar.days.wednesday', short: 'WED' },
  { key: 'thursday', labelKey: 'calendar.days.thursday', short: 'THU' },
  { key: 'friday', labelKey: 'calendar.days.friday', short: 'FRI' },
  { key: 'saturday', labelKey: 'calendar.days.saturday', short: 'SAT' },
  { key: 'sunday', labelKey: 'calendar.days.sunday', short: 'SUN' },
];

const getTodayKey = () => {
  const idx = new Date().getDay();
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[idx];
};

// Items without a broadcast time go to the end. Within a time bucket we
// preserve Jikan's original order (roughly by popularity).
const sortByBroadcast = (items) =>
  [...items].sort((a, b) => {
    const at = a?.broadcast?.time;
    const bt = b?.broadcast?.time;
    if (!at && !bt) return 0;
    if (!at) return 1;
    if (!bt) return -1;
    return at.localeCompare(bt);
  });

function CalendarPage({ schedulesByDay, t }) {
  const today = getTodayKey();
  const sortedByDay = useMemo(() => {
    const out = {};
    for (const day of DAYS) {
      out[day.key] = sortByBroadcast(schedulesByDay?.[day.key] || []);
    }
    return out;
  }, [schedulesByDay]);

  const totalCount = Object.values(sortedByDay).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  const currentSeasonLabel = formatSeasonLabel(getSeasonFromDate(), new Date().getFullYear());

  return (
    <Layout title={t('calendar.metaTitle')} description={t('calendar.metaDesc')}>
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>
            {currentSeasonLabel.toUpperCase()} · {t('calendar.eyebrow')}
          </div>
          <h1 className={styles.heading}>{t('calendar.title')}</h1>
          <p className={styles.subtitle}>
            {totalCount ? t('calendar.countBody', { n: totalCount }) : t('calendar.unavailable')}
          </p>
        </header>

        <div className={styles.grid}>
          {DAYS.map((day) => {
            const items = sortedByDay[day.key] || [];
            const isToday = today === day.key;
            return (
              <section
                key={day.key}
                className={`${styles.column} ${isToday ? styles.columnToday : ''}`}
              >
                <div className={styles.columnHead}>
                  <span className={styles.columnLabel}>{t(day.labelKey)}</span>
                  <span className={styles.columnCount}>{items.length}</span>
                </div>
                {isToday ? <span className={styles.todayBadge}>{t('calendar.today')}</span> : null}
                {items.length === 0 ? (
                  <div className={styles.emptyDay}>{t('calendar.noEpisodes')}</div>
                ) : (
                  <div className={styles.columnBody}>
                    {items.map((item) => (
                      <CalendarCell
                        key={item.mal_id}
                        anime={item}
                        broadcastTime={item?.broadcast?.time || null}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

export default translate(CalendarPage);

// Reduce to the fields we actually render — keeps the SSR props payload
// small and avoids shipping Jikan's entire schedule row to the browser.
const pickScheduleFields = (item) => ({
  mal_id: item?.mal_id,
  title: item?.title,
  image: item?.image,
  images: {
    webp: {
      image_url: item?.images?.webp?.image_url,
      large_image_url: item?.images?.webp?.large_image_url,
    },
    jpg: {
      image_url: item?.images?.jpg?.image_url,
      large_image_url: item?.images?.jpg?.large_image_url,
    },
  },
  broadcast: item?.broadcast ? { time: item.broadcast.time } : null,
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
