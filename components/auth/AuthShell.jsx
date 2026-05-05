import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import Logo from '../ui/Logo';
import styles from './AuthShell.module.css';

// Pool of popular anime posters from MAL, curated by hitting Jikan's top
// popular endpoint and picking well-known titles. The `l.jpg` suffix serves
// MAL's large (~450×640) variant instead of the default thumbnail — avoids
// blur when each tile is rendered at ~320×480. Every URL was verified 200.
const POSTER_POOL = [
  'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',    // Shingeki no Kyojin
  'https://cdn.myanimelist.net/images/anime/1079/138100l.jpg', // Death Note
  'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg',  // Fullmetal Alchemist: Brotherhood
  'https://cdn.myanimelist.net/images/anime/12/76049l.jpg',    // One Punch Man
  'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',  // Kimetsu no Yaiba
  'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',    // Boku no Hero Academia
  'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',  // Hunter x Hunter (2011)
  'https://cdn.myanimelist.net/images/anime/1141/142503l.jpg', // Naruto
  'https://cdn.myanimelist.net/images/anime/1498/134443l.jpg', // Tokyo Ghoul
  'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg', // Jujutsu Kaisen
  'https://cdn.myanimelist.net/images/anime/5/87048l.jpg',     // Kimi no Na wa
  'https://cdn.myanimelist.net/images/anime/1935/127974l.jpg', // Steins;Gate
  'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg', // One Piece
  'https://cdn.myanimelist.net/images/anime/1173/92110l.jpg',  // Shingeki no Kyojin Season 3
  'https://cdn.myanimelist.net/images/anime/1122/96435l.jpg',  // Koe no Katachi
  'https://cdn.myanimelist.net/images/anime/1074/111944l.jpg', // No Game No Life
  'https://cdn.myanimelist.net/images/anime/1032/135088l.jpg', // Code Geass
  'https://cdn.myanimelist.net/images/anime/1522/128039l.jpg', // Re:Zero
  'https://cdn.myanimelist.net/images/anime/1405/143284l.jpg', // Shigatsu wa Kimi no Uso
  'https://cdn.myanimelist.net/images/anime/13/22128l.jpg',    // Toradora!
  'https://cdn.myanimelist.net/images/anime/8/80356l.jpg',     // Mob Psycho 100
  'https://cdn.myanimelist.net/images/anime/1886/128266l.jpg', // Noragami
  'https://cdn.myanimelist.net/images/anime/10/77957l.jpg',    // Erased
  'https://cdn.myanimelist.net/images/anime/1000/110531l.jpg', // AoT: The Final Season
  'https://cdn.myanimelist.net/images/anime/8/65409l.jpg',     // Seven Deadly Sins
  'https://cdn.myanimelist.net/images/anime/1541/147774l.jpg', // Bleach
  'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',     // Haikyuu!!
  'https://cdn.myanimelist.net/images/anime/1830/118780l.jpg', // The Promised Neverland
  'https://cdn.myanimelist.net/images/anime/1895/142748l.jpg', // KonoSuba
  'https://cdn.myanimelist.net/images/anime/4/19644l.jpg',     // Cowboy Bebop
  'https://cdn.myanimelist.net/images/anime/3/73178l.jpg',     // Parasyte
  'https://cdn.myanimelist.net/images/anime/6/79597l.jpg',     // Spirited Away
  'https://cdn.myanimelist.net/images/anime/1314/108941l.jpg', // Evangelion
  'https://cdn.myanimelist.net/images/anime/1795/95088l.jpg',  // Violet Evergarden
  'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg', // Chainsaw Man
  'https://cdn.myanimelist.net/images/anime/1613/102576l.jpg', // Dr. Stone
  'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', // Frieren
  'https://cdn.myanimelist.net/images/anime/1500/103005l.jpg', // Vinland Saga
  'https://cdn.myanimelist.net/images/anime/1530/117776l.jpg', // Mushoku Tensei
];

const VISIBLE_COUNT = 12;

// Fisher–Yates shuffle — unbiased, O(n).
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
  // Deterministic initial slice for SSR/first paint (first N from pool) — then
  // shuffle on mount so each visit shows a different random subset. Prevents
  // hydration mismatches that would occur if Math.random() ran during render.
  const initial = useMemo(() => POSTER_POOL.slice(0, VISIBLE_COUNT), []);
  const [picked, setPicked] = useState(initial);
  useEffect(() => {
    setPicked(shuffle(POSTER_POOL).slice(0, VISIBLE_COUNT));
  }, []);
  // Double the picked list so translateY(-50%) loops seamlessly.
  const posters = [...picked, ...picked];
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
