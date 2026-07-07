import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLanguage, translate } from 'react-switch-lang';
import { isAiringAnime } from '../../lib/utils/anime';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { isSameCalendarDay } from '../../lib/utils/time';
import styles from './MobileCalendar.module.css';

const formatMonthAbbr = (date, lang) =>
  new Intl.DateTimeFormat(lang || 'en', { month: 'short' }).format(date).toUpperCase();

const formatDateLong = (date, lang) =>
  new Intl.DateTimeFormat(lang || 'en', { weekday: 'long', month: 'short', day: 'numeric' })
    .format(date)
    .toUpperCase();

const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const tzAbbr = () => {
  try {
    const part = new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value || 'LOCAL';
  } catch {
    return 'LOCAL';
  }
};

function MobileCalendar({ week, now, bucket, myListIds, totalCount, t }) {
  const lang = getLanguage();
  const todayIdx = week.findIndex(({ date }) => isSameCalendarDay(date, now));
  const [activeIdx, setActiveIdx] = useState(todayIdx >= 0 ? todayIdx : 0);

  const itemsByDay = useMemo(() => {
    const out = {};
    week.forEach(({ key }) => {
      out[key] = [];
    });
    if (!bucket?.slots) return out;
    for (const [slotKey, entries] of bucket.slots) {
      const [day] = slotKey.split(':');
      if (!out[day]) continue;
      entries.forEach(({ item, localTime }) => {
        out[day].push({ item, localTime });
      });
    }
    Object.values(out).forEach((arr) => {
      arr.sort((a, b) => (b.localTime || '').localeCompare(a.localTime || ''));
    });
    return out;
  }, [bucket, week]);

  const inListCounts = useMemo(() => {
    const out = {};
    Object.entries(itemsByDay).forEach(([key, items]) => {
      out[key] = items.filter(({ item }) => myListIds.has(String(item?.mal_id))).length;
    });
    return out;
  }, [itemsByDay, myListIds]);

  const activeDay = week[activeIdx] || week[0];
  const activeItems = activeDay ? itemsByDay[activeDay.key] || [] : [];
  const activeInList = activeDay ? inListCounts[activeDay.key] || 0 : 0;

  const weekNum = useMemo(() => (week[0]?.date ? isoWeek(week[0].date) : null), [week]);
  const weekRange = useMemo(() => {
    if (!week.length) return '';
    const startMo = formatMonthAbbr(week[0].date, lang);
    const endMo = formatMonthAbbr(week[6].date, lang);
    const startDay = week[0].date.getDate();
    const endDay = week[6].date.getDate();
    return startMo === endMo
      ? `${startMo} ${startDay} – ${endDay}`
      : `${startMo} ${startDay} – ${endMo} ${endDay}`;
  }, [week, lang]);

  const tz = useMemo(() => tzAbbr(), []);

  return (
    <div className={styles.mobileCalendar}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.headerEyebrow}>
            {weekNum ? `${t('calendar.weekLabel', { n: weekNum })} · ${weekRange}` : weekRange}
          </span>
          <div className={styles.headerNav}>
            <button type="button" className={styles.navBtn} aria-label={t('calendar.prevWeek')}>
              <ChevronLeft size={14} strokeWidth={2.2} />
            </button>
            <button type="button" className={styles.navBtn} aria-label={t('calendar.nextWeek')}>
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <h1 className={styles.headerTitle}>{t('calendar.titleStart')}</h1>
        <div className={styles.headerStats}>
          <span className={styles.headerStatsNum}>
            {t('calendar.mobileSimulcastsCount', { n: totalCount })}
          </span>
          <span className={styles.headerStatsRest}>
            {t('calendar.mobileSimulcastsRest', {
              inList: (userListInWeekCount(itemsByDay, myListIds) || 0),
            })}
          </span>
        </div>
      </header>

      <div className={styles.dayStrip} role="tablist">
        {week.map(({ key, date }, i) => {
          const on = i === activeIdx;
          const dayName = new Intl.DateTimeFormat(lang || 'en', { weekday: 'short' })
            .format(date)
            .toUpperCase();
          const num = date.getDate();
          const count = (itemsByDay[key] || []).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.dayPill} ${on ? styles.dayPillActive : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <span className={styles.dayPillLabel}>{dayName}</span>
              <span className={styles.dayPillNum}>{num}</span>
              <span className={styles.dayPillCount}>{count} EP</span>
            </button>
          );
        })}
      </div>

      {activeDay ? (
        <>
          <div className={styles.dayHead}>
            <div>
              <div className={styles.dayHeadEyebrow}>{formatDateLong(activeDay.date, lang)}</div>
              <div className={styles.dayHeadTitle}>
                {t('calendar.mobileEpsToday', { n: activeItems.length })}
              </div>
            </div>
            {activeInList > 0 ? (
              <span className={styles.inListPill}>
                <span className={styles.inListDot} />
                {t('calendar.mobileInList', { n: activeInList })}
              </span>
            ) : null}
          </div>

          {activeItems.length === 0 ? (
            <div className={styles.empty}>{t('calendar.noEpisodes')}</div>
          ) : (
            <div className={styles.list}>
              {activeItems.map(({ item, localTime }, i) => (
                <EpisodeRow
                  key={`${item?.mal_id}-${i}`}
                  item={item}
                  localTime={localTime}
                  inList={myListIds.has(String(item?.mal_id))}
                  tz={tz}
                  t={t}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function userListInWeekCount(itemsByDay, myListIds) {
  const seen = new Set();
  Object.values(itemsByDay).forEach((arr) => {
    arr.forEach(({ item }) => {
      const id = String(item?.mal_id);
      if (myListIds.has(id)) seen.add(id);
    });
  });
  return seen.size;
}

function EpisodeRow({ item, localTime, inList, tz, t }) {
  const cover = getAnimeImageUrl(item);
  const simul = isAiringAnime(item);
  return (
    <Link
      href={item?.mal_id ? `/anime/${item.mal_id}` : '#'}
      className={`${styles.row} ${inList ? styles.rowInList : ''}`}
    >
      <span className={styles.rowCover}>
        {cover ? <Image src={cover} alt={item?.title || ''} fill sizes="52px" /> : null}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{item?.title || '—'}</span>
        <span className={styles.rowTags}>
          {simul ? <span className={styles.tagSimul}>SIMUL</span> : null}
          {inList ? <span className={styles.tagInList}>· {t('calendar.tagInList')}</span> : null}
        </span>
      </span>
      <span className={styles.rowTime}>
        <span className={styles.rowTimeBig}>{localTime || '—'}</span>
        <span className={styles.rowTimeTz}>{tz} / LOCAL</span>
      </span>
    </Link>
  );
}

export default translate(MobileCalendar);
