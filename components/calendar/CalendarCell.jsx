import Link from 'next/link';
import { getAnimeImageUrl } from '../../lib/utils/media';
import styles from './calendar.module.css';

// Compact schedule entry sitting inside a timetable hour slot.
// 44px poster thumb + time + title clamped to 2 lines. A small dot in
// the top-right marks entries that are in the user's list.

function CalendarCell({ anime, broadcastTime, inList, localTime }) {
  const poster = getAnimeImageUrl(anime) || '/logo_no_text.png';
  const displayTime = localTime || broadcastTime;
  const tooltip = broadcastTime
    ? `${anime?.title || ''} · ${broadcastTime} JST`
    : anime?.title;

  return (
    <Link
      href={`/anime/${anime.mal_id}`}
      className={`${styles.entry} ${inList ? styles.entryInList : ''}`}
      title={tooltip}
    >
      <div className={styles.entryPoster}>
        {/* Plain <img> — not next/image — because this is a 44px
            decorative thumb and one calendar week can paint ~90 of
            them. Going through Vercel's Image Optimizer would burn
            the Hobby tier's 5K/month transformations budget fast
            for zero visual gain at this size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          className={styles.entryImage}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className={styles.entryBody}>
        {displayTime ? <div className={styles.entryTime}>{displayTime}</div> : null}
        <div className={styles.entryTitle}>{anime.title || 'Untitled'}</div>
      </div>
      {inList ? <span className={styles.entryDot} aria-label="in your list" /> : null}
    </Link>
  );
}

export default CalendarCell;
