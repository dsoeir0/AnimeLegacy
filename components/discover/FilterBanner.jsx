import { useRouter } from 'next/router';
import Link from 'next/link';
import { Star, TrendingUp, LayoutGrid, List, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import {
  DECADE_KEYS,
  SCORE_KEYS,
  SORT_KEYS,
  STATUS_KEYS,
  TYPE_KEYS,
  VIEW_KEYS,
} from '../../lib/utils/discoverFilter';
import styles from './discover.module.css';

const SORT_ICON = { top: Star, popular: TrendingUp, new: null, az: null };
const SORT_LABEL_KEY = {
  top: 'discoverPage.filter.sortTop',
  new: 'discoverPage.filter.sortNew',
  az: 'discoverPage.filter.sortAz',
  popular: 'discoverPage.filter.sortPopular',
};

const TYPE_OPTIONS = TYPE_KEYS;
const STATUS_OPTIONS = STATUS_KEYS;
const DECADE_OPTIONS = DECADE_KEYS;
const SCORE_OPTIONS = SCORE_KEYS;

function FilterBanner({
  activeMood,
  activeGenre,
  count,
  sort,
  view,
  type,
  status,
  decade,
  minScore,
  accent,
  t,
}) {
  const router = useRouter();

  const setQueryParam = (key, value) => {
    const next = { ...router.query, page: 1 };
    if (value) next[key] = value;
    else delete next[key];
    return { pathname: '/search', query: next };
  };

  const goTo = (key, value) => {
    const target = setQueryParam(key, value);
    router.push(target);
  };

  const eyebrow = activeMood
    ? t('discoverPage.filter.eyebrowMood', { count })
    : t('discoverPage.filter.eyebrowGenre', { count });

  const title = activeMood ? t(activeMood.labelKey) : activeGenre?.name || '';
  const sub = activeMood ? t(activeMood.subKey) : null;

  const Select = ({ name, current, options, labelFor }) => (
    <label className={styles.filterSelect}>
      <span className={styles.filterSelectLabel}>
        {t(`discoverPage.filter.${name}Label`)}
      </span>
      <select
        value={current || ''}
        onChange={(e) => goTo(name === 'minScore' ? 'min' : name, e.target.value)}
        className={styles.filterSelectInput}
      >
        {options.map((opt) => (
          <option key={opt || 'any'} value={opt}>
            {labelFor(opt)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      className={styles.filterBanner}
      style={
        accent
          ? {
              background: `linear-gradient(135deg, ${accent}11 0%, transparent 60%), var(--al-ink-2)`,
            }
          : undefined
      }
    >
      <div className={styles.filterBannerHead}>
        <div className={styles.filterBannerLeft}>
          <div className={styles.filterBannerEyebrow}>{eyebrow}</div>
          <h2 className={styles.filterBannerTitle}>
            {title}
            <Link
              href="/search"
              className={styles.filterBannerClose}
              aria-label={t('discoverPage.filter.clear')}
            >
              <X size={16} strokeWidth={2.4} />
            </Link>
          </h2>
          {sub ? <div className={styles.filterBannerSub}>{sub}</div> : null}
        </div>
        <div className={styles.filterBannerControls}>
          <div className={styles.filterSortGroup}>
            {SORT_KEYS.map((key) => {
              const Icon = SORT_ICON[key];
              const active = sort === key;
              return (
                <Link
                  key={key}
                  href={setQueryParam('sort', key === 'top' ? '' : key)}
                  className={`${styles.filterSortPill} ${active ? styles.filterSortPillActive : ''}`}
                >
                  {Icon ? <Icon size={11} strokeWidth={2.4} /> : null}
                  <span>{t(SORT_LABEL_KEY[key])}</span>
                </Link>
              );
            })}
          </div>
          <div className={styles.filterViewGroup}>
            {VIEW_KEYS.map((key) => {
              const Icon = key === 'grid' ? LayoutGrid : List;
              const active = view === key;
              return (
                <Link
                  key={key}
                  href={setQueryParam('view', key === 'grid' ? '' : key)}
                  className={`${styles.filterViewBtn} ${active ? styles.filterViewBtnActive : ''}`}
                  aria-label={t(`discoverPage.filter.view${key === 'grid' ? 'Grid' : 'List'}`)}
                >
                  <Icon size={14} strokeWidth={2.2} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles.filterStrip}>
        <Select
          name="type"
          current={type}
          options={TYPE_OPTIONS}
          labelFor={(opt) =>
            opt
              ? t(`discoverPage.filter.type_${opt}`)
              : t('discoverPage.filter.typeAny')
          }
        />
        <Select
          name="status"
          current={status}
          options={STATUS_OPTIONS}
          labelFor={(opt) =>
            opt
              ? t(`discoverPage.filter.status_${opt}`)
              : t('discoverPage.filter.statusAny')
          }
        />
        <Select
          name="decade"
          current={decade}
          options={DECADE_OPTIONS}
          labelFor={(opt) =>
            opt
              ? t(`discoverPage.filter.decade_${opt}`)
              : t('discoverPage.filter.decadeAny')
          }
        />
        <Select
          name="minScore"
          current={minScore}
          options={SCORE_OPTIONS}
          labelFor={(opt) =>
            opt
              ? t('discoverPage.filter.minScoreValue', { n: opt })
              : t('discoverPage.filter.minScoreAny')
          }
        />
      </div>
    </div>
  );
}

export default translate(FilterBanner);
