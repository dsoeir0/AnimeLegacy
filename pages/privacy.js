import Link from 'next/link';
import { Mail } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import styles from './privacy.module.css';

const CONTACT_EMAIL = 'duartesoeiro@seepmode.com';

function PrivacyPage({ t }) {
  return (
    <Layout title={t('privacy.metaTitle')} description={t('privacy.metaDesc')}>
      <main className={styles.wrap}>
        <div className={styles.inner}>
          <div className={styles.eyebrow}>{t('privacy.eyebrow')}</div>
          <h1 className={styles.title}>{t('privacy.title')}</h1>

          <section className={styles.section}>
            <h2 className={styles.h2}>{t('privacy.dataHeading')}</h2>
            <p>{t('privacy.dataBody')}</p>
            <ul className={styles.list}>
              <li>{t('privacy.dataList.account')}</li>
              <li>{t('privacy.dataList.list')}</li>
              <li>{t('privacy.dataList.activity')}</li>
              <li>{t('privacy.dataList.profile')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>{t('privacy.storageHeading')}</h2>
            <p>{t('privacy.storageBody')}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>{t('privacy.rightsHeading')}</h2>
            <p>{t('privacy.rightsBody')}</p>
            <ul className={styles.list}>
              <li>{t('privacy.rightsList.access')}</li>
              <li>{t('privacy.rightsList.rectify')}</li>
              <li>{t('privacy.rightsList.erase')}</li>
              <li>{t('privacy.rightsList.export')}</li>
            </ul>
          </section>

          <section className={`${styles.section} ${styles.contactBlock}`}>
            <h2 className={styles.h2}>{t('privacy.contactHeading')}</h2>
            <p>{t('privacy.contactBody')}</p>
            <div className={styles.contactRow}>
              <a href={`mailto:${CONTACT_EMAIL}?subject=AnimeLegacy%20%E2%80%94%20Account%20deletion%20request`}>
                <Button variant="primary" size="md" icon={Mail}>
                  {t('privacy.contactCta')}
                </Button>
              </a>
              <code className={styles.email}>{CONTACT_EMAIL}</code>
            </div>
            <p className={styles.fineprint}>{t('privacy.slaNote')}</p>
          </section>

          <div className={styles.backRow}>
            <Link href="/">
              <Button variant="ghost" size="md">
                {t('actions.backHome')}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default translate(PrivacyPage);
