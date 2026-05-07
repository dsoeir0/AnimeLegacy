import { Search, X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './studios.module.css';

function StudioFilterBar({
  filter,
  onFilterChange,
  visibleCount,
  filters,
  query,
  onQueryChange,
  t,
}) {
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
      <div className={styles.filterSearch}>
        <Search size={13} className={styles.filterSearchIcon} aria-hidden="true" />
        <input
          type="text"
          className={styles.filterSearchInput}
          placeholder={t('studios.filters.searchPlaceholder')}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label={t('studios.filters.searchLabel')}
        />
        {query ? (
          <button
            type="button"
            className={styles.filterSearchClear}
            onClick={() => onQueryChange('')}
            aria-label={t('actions.clear')}
          >
            <X size={12} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <span className={styles.filterCount}>
        {t('studios.filters.showingCount', { n: visibleCount })}
      </span>
    </div>
  );
}

export default translate(StudioFilterBar);
