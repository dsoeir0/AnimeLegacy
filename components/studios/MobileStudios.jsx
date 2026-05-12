import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { translate } from 'react-switch-lang';
import { pickStudioName } from '../../lib/utils/studio';
import { accentForStudio } from '../../lib/utils/studioAccent';
import { getAnimeThumbUrl } from '../../lib/utils/media';
import styles from './MobileStudios.module.css';

const FILTER_ALL = 'all';
const FILTER_VETERAN = 'veteran';
const FILTER_MODERN = 'modern';
const FILTER_RISING = 'rising';

const FILTERS = [
  { id: FILTER_ALL, labelKey: 'studios.mobileFilters.all' },
  { id: FILTER_VETERAN, labelKey: 'studios.mobileFilters.veteran' },
  { id: FILTER_MODERN, labelKey: 'studios.mobileFilters.modern' },
  { id: FILTER_RISING, labelKey: 'studios.mobileFilters.rising' },
];

const yearOf = (iso) => {
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? y : null;
};

const eraOf = (founded) => {
  if (!Number.isFinite(founded)) return null;
  if (founded <= 1995) return FILTER_VETERAN;
  if (founded <= 2014) return FILTER_MODERN;
  return FILTER_RISING;
};

const matchesFilter = (founded, filter) => {
  if (filter === FILTER_ALL) return true;
  return eraOf(founded) === filter;
};

function MobileStudios({ items, postersByStudio, totals, t }) {
  const [filter, setFilter] = useState(FILTER_ALL);

  const visible = useMemo(() => {
    if (filter === FILTER_ALL) return items;
    return items.filter((s) => matchesFilter(yearOf(s.established), filter));
  }, [items, filter]);

  return (
    <div className={styles.mobileStudios}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t('studios.mobileEyebrow')}</span>
        <h1 className={styles.title}>{t('studios.mobileTitle')}</h1>
        <div className={styles.stats}>
          <span>{t('studios.mobileStatsIndexed', { n: totals.totalStudios.toLocaleString() })}</span>
          <span className={styles.statsDot} />
          <span>{t('studios.mobileStatsShown', { n: visible.length })}</span>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.tab} ${on ? styles.tabActive : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {t(f.labelKey)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>{t('studios.mobileEmpty')}</div>
      ) : (
        <div className={styles.list}>
          {visible.map((studio) => {
            const name = pickStudioName(studio);
            const accent = accentForStudio(studio.mal_id);
            const founded = yearOf(studio.established);
            const era = eraOf(founded);
            const eraLabel = era ? t(`studios.mobileEras.${era}`) : t('studios.mobileEras.unknown');
            const posters = (postersByStudio?.[String(studio.mal_id)] || []).slice(0, 4);
            const scored = posters.filter((p) => Number.isFinite(p?.score));
            const topScore = scored.length
              ? Math.max(...scored.map((p) => p.score))
              : null;
            return (
              <Link
                key={studio.mal_id}
                href={`/studios/${studio.mal_id}`}
                className={styles.card}
              >
                <div
                  className={styles.cardHero}
                  style={{
                    background: `linear-gradient(135deg, ${accent.base}55 0%, ${accent.base}1a 100%)`,
                  }}
                >
                  <div className={styles.cardHeroInner}>
                    <span className={styles.cardEyebrow}>
                      {founded ? `EST. ${founded}` : 'EST. —'} · {eraLabel.toUpperCase()}
                    </span>
                    <span className={styles.cardName}>{name}</span>
                  </div>
                  <div className={styles.posterStrip}>
                    {posters.map((p) => {
                      const url = getAnimeThumbUrl(p);
                      return (
                        <span key={p.mal_id} className={styles.posterTile}>
                          {url ? (
                            <Image
                              src={url}
                              alt=""
                              fill
                              sizes="44px"
                              loading="lazy"
                            />
                          ) : null}
                        </span>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 4 - posters.length) }).map((_, i) => (
                      <span
                        key={`ph-${i}`}
                        className={styles.posterTileEmpty}
                        style={{ background: `${accent.base}25` }}
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  {studio.about ? (
                    <p className={styles.cardBio}>
                      {studio.about.replace(/\s+/g, ' ').trim().slice(0, 90)}
                      {studio.about.length > 90 ? '…' : ''}
                    </p>
                  ) : null}
                  <div className={styles.cardStats}>
                    <div className={styles.cardStat}>
                      <div className={styles.cardStatLabel}>{t('studios.mobileStat.works')}</div>
                      <div className={styles.cardStatValue}>{studio.count || 0}</div>
                    </div>
                    <div className={styles.cardStat}>
                      <div className={styles.cardStatLabel}>{t('studios.mobileStat.top')}</div>
                      <div
                        className={styles.cardStatValue}
                        style={topScore !== null ? { color: 'var(--al-warm-ink)' } : undefined}
                      >
                        {topScore !== null ? (topScore / 2).toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className={styles.cardStat}>
                      <div className={styles.cardStatLabel}>{t('studios.mobileStat.active')}</div>
                      <div className={styles.cardStatValue}>
                        {studio.count > 0 ? t('studios.mobileYes') : t('studios.mobileNo')}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default translate(MobileStudios);
