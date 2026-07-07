import { Search } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './CharactersFilterBar.module.css';

function CharactersFilterBar({ query, onQueryChange, t }) {
  return (
    <div className={styles.bar}>
      <div className={styles.searchWrap}>
        <Search size={14} strokeWidth={2} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t('characters.searchPlaceholder')}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label={t('characters.searchPlaceholder')}
        />
      </div>
    </div>
  );
}

export default translate(CharactersFilterBar);
