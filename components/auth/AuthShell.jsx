import Head from 'next/head';
import { translate } from 'react-switch-lang';
import Logo from '../ui/Logo';
import styles from './AuthShell.module.css';

// Popular anime posters from the MAL CDN, used purely as decorative marquee.
const POSTER_URLS = [
  'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
  'https://cdn.myanimelist.net/images/anime/1806/126216.jpg',
  'https://cdn.myanimelist.net/images/anime/1500/103005.jpg',
  'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
  'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
  'https://cdn.myanimelist.net/images/anime/1935/127974.jpg',
  'https://cdn.myanimelist.net/images/anime/1208/94745.jpg',
  'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
  'https://cdn.myanimelist.net/images/anime/1629/133197.jpg',
  'https://cdn.myanimelist.net/images/anime/1517/100633.jpg',
  'https://cdn.myanimelist.net/images/anime/13/17405.jpg',
  'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
  'https://cdn.myanimelist.net/images/anime/1337/99013.jpg',
  'https://cdn.myanimelist.net/images/anime/1530/117776.jpg',
  'https://cdn.myanimelist.net/images/anime/1422/136957.jpg',
];

function AuthShell({ title = 'AnimeLegacy · Access', description = 'Sign in to AnimeLegacy.', children, t }) {
  const posters = [...POSTER_URLS, ...POSTER_URLS];
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/logo_no_text.png" type="image/png" />
      </Head>
      <div className={styles.shell}>
        <aside className={styles.left}>
          <div className={styles.posterColumn} aria-hidden="true">
            <div className={styles.posterMarquee}>
              {posters.concat(posters).map((src, i) => (
                <div
                  key={i}
                  className={`${styles.posterTile} ${i % 2 === 0 ? styles.posterTileOffset : ''}`}
                >
                  <img src={src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.leftGradient} />
          <div className={styles.leftGlow} />

          <header className={styles.leftHeader}>
            <Logo />
          </header>

          <div className={styles.leftCopy}>
            <div className={styles.eyebrow}>{t('auth.heroEyebrow')}</div>
            <h1 className={styles.headline}>
              {t('auth.heroLeadStart')}{' '}
              <span className={styles.headlineGradient}>{t('auth.heroLeadEmphasis')}</span>
              {t('auth.heroLeadEnd')}
            </h1>
            <p className={styles.leftBody}>{t('auth.heroBody')}</p>
          </div>
        </aside>

        <section className={styles.right}>{children}</section>
      </div>
    </>
  );
}

export default translate(AuthShell);
