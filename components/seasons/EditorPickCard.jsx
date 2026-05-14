import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { getAnimeImageUrl } from '../../lib/utils/media';
import styles from './EditorPickCard.module.css';

function EditorPickCard({ pick, media, studio, score, showRanking, t }) {
  if (!pick) return null;
  const posterUrl = getAnimeImageUrl(pick, media);
  return (
    <div className={styles.editorPickWrap}>
      <div className={styles.editorPickHeader}>{t('seasonsPage.editorPickHeader')}</div>
      <Link href={`/anime/${pick.mal_id}`} className={styles.editorPick}>
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={pick.title || ''}
            fill
            sizes="(max-width: 768px) 70vw, (max-width: 1100px) 33vw, 320px"
            className={styles.editorPickImg}
          />
        ) : null}
        <div className={styles.editorPickGradient} />
        {showRanking ? (
          <div className={styles.editorPickEyebrow}>{t('seasonsPage.editorPickRank')}</div>
        ) : null}
        <div className={styles.editorPickContent}>
          <div className={styles.editorPickTitle}>{pick.title}</div>
          <div className={styles.editorPickMeta}>
            {studio ? <span>{studio}</span> : null}
            {pick.episodes ? (
              <>
                {studio ? <span>·</span> : null}
                <span>{pick.episodes} ep</span>
              </>
            ) : null}
          </div>
          {score !== null ? (
            <div className={styles.editorPickScore}>
              ★ {score.toFixed(2)}{' '}
              <span className={styles.editorPickScoreSuffix}>MAL</span>
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

export default translate(EditorPickCard);
