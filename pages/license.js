import Link from 'next/link';
import { translate } from 'react-switch-lang';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import styles from './license.module.css';

const LICENSE_TEXT = `MIT License

Copyright (c) 2026 Duarte Soeiro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OF OR OTHER DEALINGS IN
THE SOFTWARE.`;

const REPO_URL = 'https://github.com/dsoeir0/AnimeLegacy';

function LicensePage({ t }) {
  return (
    <Layout title={t('license.metaTitle')} description={t('license.metaDesc')}>
      <main className={styles.wrap}>
        <div className={styles.inner}>
          <div className={styles.eyebrow}>{t('license.eyebrow')}</div>
          <h1 className={styles.title}>{t('license.title')}</h1>

          <section className={styles.section}>
            <p>{t('license.intro')}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>{t('license.whatHeading')}</h2>
            <p>{t('license.whatBody')}</p>
            <ul className={styles.list}>
              <li>{t('license.permissions.use')}</li>
              <li>{t('license.permissions.modify')}</li>
              <li>{t('license.permissions.distribute')}</li>
              <li>{t('license.permissions.sublicense')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>{t('license.conditionsHeading')}</h2>
            <p>{t('license.conditionsBody')}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>{t('license.fullTextHeading')}</h2>
            <pre className={styles.licenseText}>{LICENSE_TEXT}</pre>
          </section>

          <section className={styles.section}>
            <p className={styles.fineprint}>
              {t('license.sourceLink')}{' '}
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                {REPO_URL.replace('https://', '')}
              </a>
            </p>
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

export default translate(LicensePage);
