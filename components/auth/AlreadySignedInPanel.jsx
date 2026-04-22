import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import AuthShell from './AuthShell';
import styles from './AuthForms.module.css';

function AlreadySignedInPanel({ user, onSignOut, t }) {
  return (
    <AuthShell title="AnimeLegacy · Welcome back">
      <div className={styles.topBar} />
      <div className={styles.formArea}>
        <div className={styles.formWrap}>
          <div className={styles.eyebrow}>{t('profile.alreadySignedInEyebrow')}</div>
          <h2 className={styles.heading}>{t('auth.welcomeBackTitle')}</h2>
          <div className={styles.signedIn}>
            <p>
              {t('profile.signedInAs')}{' '}
              <strong>{user.displayName || user.email || 'AnimeLegacy User'}</strong>.
            </p>
            <Link href="/my-list">
              <Button variant="primary" size="md" fullWidth icon={ArrowRight}>
                {t('actions.goToMyList')}
              </Button>
            </Link>
          </div>
          <div className={styles.altLink}>
            <span>{t('profile.notYou')}</span>
            <button
              type="button"
              onClick={onSignOut}
              className={styles.inlineTextButton}
            >
              {t('actions.signOut')}
            </button>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export default translate(AlreadySignedInPanel);
