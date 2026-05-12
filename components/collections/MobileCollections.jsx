import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './MobileCollections.module.css';

const TABS = [
  { id: 'all', labelKey: 'collectionsPage.mobileTabs.all' },
  { id: 'editorial', labelKey: 'collectionsPage.mobileTabs.editorial' },
  { id: 'community', labelKey: 'collectionsPage.mobileTabs.community' },
  { id: 'saved', labelKey: 'collectionsPage.mobileTabs.saved' },
];

function MobileCollections({ t }) {
  const [tab, setTab] = useState('all');

  return (
    <div className={styles.mobileCollections}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t('collectionsPage.mobileEyebrow')}</span>
        <h1 className={styles.title}>{t('collectionsPage.mobileTitle')}</h1>
        <div className={styles.stats}>
          <span>{t('collectionsPage.mobileStatsRoadmap')}</span>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {TABS.map((tabItem) => {
          const on = tabItem.id === tab;
          return (
            <button
              key={tabItem.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.tab} ${on ? styles.tabActive : ''}`}
              onClick={() => setTab(tabItem.id)}
            >
              {t(tabItem.labelKey)}
            </button>
          );
        })}
      </div>

      <div className={styles.placeholder}>
        <div className={styles.placeholderIcon}>
          <Sparkles size={22} strokeWidth={1.75} />
        </div>
        <div className={styles.placeholderEyebrow}>{t('comingSoon.collections.eyebrow')}</div>
        <h2 className={styles.placeholderTitle}>{t('comingSoon.collections.title')}</h2>
        <p className={styles.placeholderBody}>{t('comingSoon.collections.body')}</p>
        <ul className={styles.bullets}>
          <li>{t('comingSoon.collections.bullet1')}</li>
          <li>{t('comingSoon.collections.bullet2')}</li>
          <li>{t('comingSoon.collections.bullet3')}</li>
        </ul>
      </div>
    </div>
  );
}

export default translate(MobileCollections);
