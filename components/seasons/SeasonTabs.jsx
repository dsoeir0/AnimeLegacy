import { translate } from 'react-switch-lang';
import { SEASON_KEYS } from '../../lib/utils/season';
import styles from './SeasonTabs.module.css';

const SEASON_TAB_DEFS = SEASON_KEYS.map((key) => ({
  key,
  labelKey: `seasonsPage.seasons.${key}`,
  rangeKey: `seasonsPage.tabRanges.${key}`,
}));

function SeasonTabs({ seasonMap, gridScope, totalAcrossYear, onSelectSeason, onSelectAll, t }) {
  return (
    <div className={styles.tabs}>
      {SEASON_TAB_DEFS.map((s) => {
        const count = seasonMap[s.key]?.length || 0;
        const empty = count === 0;
        return (
          <button
            key={s.key}
            type="button"
            disabled={empty}
            aria-disabled={empty}
            className={`${styles.tab} ${gridScope === s.key ? styles.tabActive : ''} ${
              empty ? styles.tabEmpty : ''
            }`}
            onClick={() => {
              if (!empty) onSelectSeason(s.key);
            }}
          >
            <span className={styles.tabLabel}>
              {t(s.labelKey)}
              <span className={styles.tabCount}>{count}</span>
            </span>
            <span className={styles.tabRange}>{t(s.rangeKey)}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`${styles.tab} ${gridScope === 'all' ? styles.tabActive : ''}`}
        onClick={onSelectAll}
      >
        <span className={styles.tabLabel}>
          {t('seasonsPage.seasons.all')}
          <span className={styles.tabCount}>{totalAcrossYear}</span>
        </span>
        <span className={styles.tabRange}>{t('seasonsPage.tabRanges.all')}</span>
      </button>
    </div>
  );
}

export default translate(SeasonTabs);
