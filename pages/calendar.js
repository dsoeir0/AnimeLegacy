import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import PosterCard from '../components/cards/PosterCard';
import { getSchedules } from '../lib/services/jikan';
import { filterOutHentai } from '../lib/utils/anime';
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

const getTodayKey = () => {
  const idx = new Date().getDay();
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[idx];
};

function CalendarPage({ schedulesByDay, t }) {
  const today = getTodayKey();
  const totalCount = Object.values(schedulesByDay || {}).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0,
  );

  return (
    <Layout title={t('calendar.metaTitle')} description={t('calendar.metaDesc')}>
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>{t('calendar.eyebrow')}</div>
          <h1 className={styles.heading}>{t('calendar.title')}</h1>
          <p className={styles.subtitle}>
            {totalCount ? t('calendar.countBody', { n: totalCount }) : t('calendar.unavailable')}
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
                    <div className={styles.dayLabel}>{t(day.labelKey)}</div>
                    {isToday ? <span className={styles.todayTag}>{t('calendar.today')}</span> : null}
                  </div>
                  <span className={styles.dayCount}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className={styles.emptyDay}>{t('calendar.noEpisodes')}</div>
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

export default translate(CalendarPage);

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
