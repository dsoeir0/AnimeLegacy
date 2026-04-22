import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getAnimeImageUrl } from '../../lib/utils/media';
import { jstToLocalTime } from '../../lib/utils/time';
import styles from './calendar.module.css';

// Single show card inside a day column.
//
// Server renders the JST time immediately; on mount we compute the viewer's
// local equivalent and swap the display. The JST label stays as a tooltip
// so you can still see the canonical schedule time.

function CalendarCell({ anime, broadcastTime }) {
  const [display, setDisplay] = useState(broadcastTime || null);
  const [tooltip, setTooltip] = useState(
    broadcastTime ? `${broadcastTime} JST` : null,
  );

  useEffect(() => {
    if (!broadcastTime) return;
    const converted = jstToLocalTime(broadcastTime);
    if (!converted) return;
    // Show local time when it differs meaningfully from JST
    if (converted.local !== converted.jst) {
      setDisplay(converted.local);
      setTooltip(`${converted.jst} JST`);
    }
  }, [broadcastTime]);

  const poster = getAnimeImageUrl(anime) || '/logo_no_text.png';

  return (
    <Link
      href={`/anime/${anime.mal_id}`}
      className={styles.cell}
      title={tooltip || anime.title}
    >
      <Image
        src={poster}
        alt={anime.title || 'Anime'}
        fill
        sizes="(max-width: 1100px) 30vw, 160px"
        quality={80}
        className={styles.cellPoster}
      />
      <div className={styles.cellGradient} />
      <div className={styles.cellMeta}>
        {display ? <div className={styles.cellTime}>{display}</div> : null}
        <div className={styles.cellTitle}>{anime.title || 'Untitled'}</div>
      </div>
    </Link>
  );
}

export default CalendarCell;
