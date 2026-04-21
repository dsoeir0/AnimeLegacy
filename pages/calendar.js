import Layout from '../components/layout/Layout';
import PosterCard from '../components/cards/PosterCard';
import { getSchedules } from '../lib/services/jikan';
import { filterOutHentai } from '../lib/utils/anime';
import styles from './calendar.module.css';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const getTodayKey = () => {
  const idx = new Date().getDay();
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[idx];
};

export default function CalendarPage({ schedulesByDay }) {
  const today = getTodayKey();
  const totalCount = Object.values(schedulesByDay || {}).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0,
  );

  return (
    <Layout title="AnimeLegacy · Calendar" description="Weekly broadcast schedule for currently airing anime.">
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>WEEKLY BROADCAST</div>
          <h1 className={styles.heading}>Simulcast calendar</h1>
          <p className={styles.subtitle}>
            {totalCount
              ? `${totalCount} shows airing this week. New episodes drop on the days below — in your local timezone via Jikan.`
              : 'Broadcast schedule is currently unavailable. Try again in a few minutes.'}
          </p>
        </header>

        <div className={styles.days}>
          {DAYS.map((day) => {
            const items = schedulesByDay?.[day.key] || [];
            const isToday = today === day.key;
            return (
              <section key={day.key} className={`${styles.day} ${isToday ? styles.dayToday : ''}`}>
                <div className={styles.dayHead}>
                  <div>
                    <div className={styles.dayLabel}>{day.label}</div>
                    {isToday ? <span className={styles.todayTag}>TODAY</span> : null}
                  </div>
                  <span className={styles.dayCount}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className={styles.emptyDay}>No scheduled episodes.</div>
                ) : (
                  <div className={styles.dayGrid}>
                    {items.map((item) => (
                      <PosterCard
                        key={item.mal_id}
                        anime={item}
                        href={`/anime/${item.mal_id}`}
                        width="100%"
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

export async function getServerSideProps() {
  try {
    const entries = await Promise.all(
      DAYS.map((day) => getSchedules(day.key).then((res) => [day.key, res])),
    );
    const schedulesByDay = Object.fromEntries(
      entries.map(([key, res]) => [
        key,
        Array.isArray(res?.data) ? filterOutHentai(res.data).slice(0, 18) : [],
      ]),
    );
    return { props: { schedulesByDay } };
  } catch {
    return { props: { schedulesByDay: {} } };
  }
}
