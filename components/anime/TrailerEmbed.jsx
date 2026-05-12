import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './TrailerEmbed.module.css';

const VIDEO_ID_REGEX = /\/embed\/([a-zA-Z0-9_-]{6,})/;

const extractYouTubeId = (embedUrl) => {
  if (typeof embedUrl !== 'string') return null;
  const match = embedUrl.match(VIDEO_ID_REGEX);
  return match ? match[1] : null;
};

const buildAutoplayUrl = (embedUrl) => {
  const sep = embedUrl.includes('?') ? '&' : '?';
  return `${embedUrl}${sep}autoplay=1`;
};

function TrailerEmbed({ embedUrl, title, t }) {
  const [activated, setActivated] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const videoId = extractYouTubeId(embedUrl);

  if (!videoId) return null;

  if (activated) {
    return (
      <iframe
        className={styles.iframe}
        title={title || 'Trailer'}
        src={buildAutoplayUrl(embedUrl)}
        allow="accelerometer; autoplay; fullscreen; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  const thumbUrl = thumbFailed
    ? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`
    : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <button
      type="button"
      className={styles.facade}
      aria-label={t('actions.watchTrailer')}
      onClick={() => setActivated(true)}
    >
      <Image
        src={thumbUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 720px"
        className={styles.thumb}
        onError={() => setThumbFailed(true)}
        priority={false}
      />
      <span className={styles.gradient} aria-hidden="true" />
      <span className={styles.playButton}>
        <Play size={26} strokeWidth={0} fill="currentColor" />
      </span>
    </button>
  );
}

export default translate(TrailerEmbed);
