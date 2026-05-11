import Link from 'next/link';
import { Compass, Upload } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

function ProfileEmptyState({ t }) {
  return (
    <section className={styles.emptyHero}>
      <h2 className={styles.emptyHeroTitle}>{t('profile.empty.title')}</h2>
      <p className={styles.emptyHeroBody}>{t('profile.empty.body')}</p>
      <div className={styles.emptyHeroActions}>
        <Link href="/search" className={styles.emptyHeroPrimary}>
          <Compass size={16} strokeWidth={2.2} />
          {t('profile.empty.discover')}
        </Link>
        <Link href="/import/mal" className={styles.emptyHeroSecondary}>
          <Upload size={16} strokeWidth={2.2} />
          {t('profile.empty.import')}
        </Link>
      </div>
    </section>
  );
}

export default translate(ProfileEmptyState);
