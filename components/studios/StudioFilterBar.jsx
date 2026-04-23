import { translate } from 'react-switch-lang';
import styles from './studios.module.css';

// Filter chip row for the studios grid — 4 filters based on founding year
// bands (defined in pages/studios/index.js) plus a "N SHOWN" count on the
// right. Purely controlled by the parent page's filter state.
function StudioFilterBar({ filter, onFilterChange, visibleCount, filters, t }) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`${styles.filterBtn} ${filter === f.id ? styles.filterBtnActive : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>
      <span className={styles.filterCount}>
        {t('studios.filters.showingCount', { n: visibleCount })}
      </span>
    </div>
  );
}

export default translate(StudioFilterBar);
