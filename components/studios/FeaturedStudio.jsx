import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bell } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import { pickStudioName, studioInitial } from '../../lib/utils/studio';
import { accentForStudio } from '../../lib/utils/studioAccent';
import styles from './studios.module.css';

const CURRENT_YEAR = new Date().getFullYear();

const yearOf = (iso) => {
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? y : null;
};

const posterUrl = (anime) =>
  anime?.images?.webp?.large_image_url ||
  anime?.images?.webp?.image_url ||
  anime?.images?.jpg?.large_image_url ||
  anime?.images?.jpg?.image_url ||
  '';

const shortenBio = (about, max = 320) => {
  if (typeof about !== 'string') return '';
  const cleaned = about.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max);
  const cut = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, cut > 120 ? cut : max)}…`;
};

// Hero-style block for the most-favourited animation studio on the page.
// Shows identity (logo + name + founded year), a truncated bio, three
// stats (Productions / Years active / Score avg of portfolio), two CTAs,
// and a portfolio strip of the studio's top-scored anime.
function FeaturedStudio({ studio, portfolio, t }) {
  if (!studio) return null;

  const name = pickStudioName(studio);
  const accent = accentForStudio(studio.mal_id);
  const founded = yearOf(studio.established);
  const yearsActive =
    founded && CURRENT_YEAR - founded > 0 ? CURRENT_YEAR - founded : null;

  const scored = (portfolio || []).filter((p) => Number.isFinite(p?.score));
  const scoreAvg = scored.length
    ? scored.reduce((sum, p) => sum + p.score, 0) / scored.length
    : null;

  return (
    <section
      className={styles.featured}
      style={{
        background: `linear-gradient(135deg, ${accent.base}20, transparent 55%), var(--al-ink-2)`,
        borderColor: `${accent.base}44`,
      }}
    >
      <div className={styles.featuredBody}>
        <div className={styles.featuredEyebrow}>{t('studios.featured.eyebrow')}</div>
        <div className={styles.featuredIdent}>
          <div
            className={styles.featuredLogo}
            style={{ background: accent.base }}
          >
            {studioInitial(name)}
          </div>
          <div className={styles.featuredIdentBody}>
            <h2 className={styles.featuredName}>{name}</h2>
            <div className={styles.featuredMeta}>
              {founded ? (
                <>
                  <span>{t('studios.card.foundedShort')}</span>{' '}
                  <span className={styles.featuredFounded}>{founded}</span>
                </>
              ) : (
                <span>{t('studios.card.foundedUnknown')}</span>
              )}
            </div>
          </div>
        </div>

        {studio.about ? (
          <p className={styles.featuredBio}>{shortenBio(studio.about, 320)}</p>
        ) : null}

        <div className={styles.featuredStats}>
          <div>
            <div className={styles.headStatLabel}>
              {t('studios.card.productions')}
            </div>
            <div className={styles.featuredStatValue}>{studio.count || 0}</div>
          </div>
          <div>
            <div className={styles.headStatLabel}>
              {t('studios.card.yearsActive')}
            </div>
            <div className={styles.featuredStatValue}>
              {yearsActive ?? '—'}
            </div>
          </div>
          <div>
            <div className={styles.headStatLabel}>
              {t('studios.card.scoreAvg')}
            </div>
            <div className={`${styles.featuredStatValue} ${styles.cardStatScore}`}>
              {scoreAvg !== null && Number.isFinite(scoreAvg)
                ? scoreAvg.toFixed(2)
                : '—'}
            </div>
          </div>
        </div>

        <div className={styles.featuredActions}>
          <Link href={`/studios/${studio.mal_id}`} className={styles.featuredLink}>
            <Button variant="primary" size="md" iconRight={ArrowRight}>
              {t('studios.featured.openCatalog')}
            </Button>
          </Link>
          <Button variant="ghost" size="md" icon={Bell} disabled>
            {t('studios.featured.follow')}
          </Button>
        </div>
      </div>

      <div className={styles.portfolio}>
        <div className={styles.portfolioLabel}>{t('studios.featured.recentWork')}</div>
        <div className={styles.portfolioGrid}>
          {portfolio.map((anime) => {
            const url = posterUrl(anime);
            return (
              <Link
                key={anime.mal_id}
                href={`/anime/${anime.mal_id}`}
                className={styles.portfolioCard}
              >
                {url ? (
                  <Image
                    src={url}
                    alt={anime.title || ''}
                    fill
                    sizes="(max-width: 768px) 33vw, 180px"
                    quality={80}
                    className={styles.portfolioImage}
                  />
                ) : null}
                <div className={styles.portfolioOverlay} />
                <div className={styles.portfolioCaption}>
                  <div className={styles.portfolioTitle}>
                    {anime.title || 'Untitled'}
                  </div>
                  {typeof anime.score === 'number' ? (
                    <div className={styles.portfolioScore}>
                      ★ {anime.score.toFixed(2)}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
          {Array.from({ length: Math.max(0, 3 - portfolio.length) }).map(
            (_, i) => (
              <div key={`ph-${i}`} className={styles.portfolioPlaceholder} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export default translate(FeaturedStudio);
