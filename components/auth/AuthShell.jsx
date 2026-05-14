import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import Logo from '../ui/Logo';
import styles from './AuthShell.module.css';

const POSTER_POOL = [
  'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
  'https://cdn.myanimelist.net/images/anime/1079/138100l.jpg',
  'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg',
  'https://cdn.myanimelist.net/images/anime/12/76049l.jpg',
  'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
  'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
  'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',
  'https://cdn.myanimelist.net/images/anime/1141/142503l.jpg',
  'https://cdn.myanimelist.net/images/anime/1498/134443l.jpg',
  'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
  'https://cdn.myanimelist.net/images/anime/5/87048l.jpg',
  'https://cdn.myanimelist.net/images/anime/1935/127974l.jpg',
  'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg',
  'https://cdn.myanimelist.net/images/anime/1173/92110l.jpg',
  'https://cdn.myanimelist.net/images/anime/1122/96435l.jpg',
  'https://cdn.myanimelist.net/images/anime/1074/111944l.jpg',
  'https://cdn.myanimelist.net/images/anime/1032/135088l.jpg',
  'https://cdn.myanimelist.net/images/anime/1522/128039l.jpg',
  'https://cdn.myanimelist.net/images/anime/1405/143284l.jpg',
  'https://cdn.myanimelist.net/images/anime/13/22128l.jpg',
  'https://cdn.myanimelist.net/images/anime/8/80356l.jpg',
  'https://cdn.myanimelist.net/images/anime/1886/128266l.jpg',
  'https://cdn.myanimelist.net/images/anime/10/77957l.jpg',
  'https://cdn.myanimelist.net/images/anime/1000/110531l.jpg',
  'https://cdn.myanimelist.net/images/anime/8/65409l.jpg',
  'https://cdn.myanimelist.net/images/anime/1541/147774l.jpg',
  'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
  'https://cdn.myanimelist.net/images/anime/1830/118780l.jpg',
  'https://cdn.myanimelist.net/images/anime/1895/142748l.jpg',
  'https://cdn.myanimelist.net/images/anime/4/19644l.jpg',
  'https://cdn.myanimelist.net/images/anime/3/73178l.jpg',
  'https://cdn.myanimelist.net/images/anime/6/79597l.jpg',
  'https://cdn.myanimelist.net/images/anime/1314/108941l.jpg',
  'https://cdn.myanimelist.net/images/anime/1795/95088l.jpg',
  'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
  'https://cdn.myanimelist.net/images/anime/1613/102576l.jpg',
  'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
  'https://cdn.myanimelist.net/images/anime/1500/103005l.jpg',
  'https://cdn.myanimelist.net/images/anime/1530/117776l.jpg',
];

const VISIBLE_COUNT = 12;

const shuffle = (arr) => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function PosterTile({ src }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={styles.posterTile} aria-hidden="true" />;
  return (
    <div className={styles.posterTile}>
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function AuthShell({ title = 'AnimeLegacy · Access', description = 'Sign in to AnimeLegacy.', children, t }) {
  // SSR uses deterministic slice; client shuffles post-mount to avoid hydration mismatch.
  const initial = useMemo(() => POSTER_POOL.slice(0, VISIBLE_COUNT), []);
  const [picked, setPicked] = useState(initial);
  useEffect(() => {
    setPicked(shuffle(POSTER_POOL).slice(0, VISIBLE_COUNT));
  }, []);
  // duplicated for seamless translateY(-50%) loop
  const posters = [...picked, ...picked];
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" type="image/svg+xml" href="/brand/iris-favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <div className={styles.shell}>
        <aside className={styles.left}>
          <div className={styles.posterColumn} aria-hidden="true">
            <div className={styles.posterMarquee}>
              {posters.map((src, i) => (
                <PosterTile key={i} src={src} />
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

        <section className={styles.right}>
          {children}
          <footer className={styles.legalFooter}>
            <Link href="/privacy" className={styles.legalLink}>
              {t('privacy.eyebrow')}
            </Link>
            <span className={styles.legalSep} aria-hidden="true">·</span>
            <Link href="/license" className={styles.legalLink}>
              {t('license.eyebrow')}
            </Link>
          </footer>
        </section>
      </div>
    </>
  );
}

export default translate(AuthShell);
