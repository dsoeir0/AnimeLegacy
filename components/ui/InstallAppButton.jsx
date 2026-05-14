import { useState } from 'react';
import { Download, Share, Plus, Smartphone } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Modal from '../modals/Modal';
import usePwaInstall from '../../hooks/usePwaInstall';
import styles from './InstallAppButton.module.css';

function InstallAppButton({ t }) {
  const { canInstall, isIos, isInstalled, isMobile, install } = usePwaInstall();
  const [open, setOpen] = useState(false);

  if (isInstalled) return null;
  if (!isMobile) return null;
  if (!canInstall && !isIos) return null;

  const handleAndroidInstall = async () => {
    await install();
    setOpen(false);
  };

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        <Download size={13} strokeWidth={2.2} />
        <span>{t('install.button')}</span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="install-title"
        closeLabel={t('install.closeLabel')}
        size="sm"
      >
        <div className={styles.content}>
          <h2 id="install-title" className={styles.title}>
            {t('install.title')}
          </h2>

          {isIos ? (
            <>
              <p className={styles.body}>{t('install.iosBody')}</p>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepIcon}>
                    <Share size={14} strokeWidth={2.2} />
                  </span>
                  <span>{t('install.iosStep1')}</span>
                </li>
                <li>
                  <span className={styles.stepIcon}>
                    <Plus size={14} strokeWidth={2.2} />
                  </span>
                  <span>{t('install.iosStep2')}</span>
                </li>
                <li>
                  <span className={styles.stepIcon}>
                    <Download size={14} strokeWidth={2.2} />
                  </span>
                  <span>{t('install.iosStep3')}</span>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className={styles.body}>{t('install.androidBody')}</p>
              <div className={styles.androidPerks}>
                <div className={styles.perk}>
                  <Smartphone size={14} strokeWidth={2.2} />
                  <span>{t('install.perkLauncher')}</span>
                </div>
                <div className={styles.perk}>
                  <Download size={14} strokeWidth={2.2} />
                  <span>{t('install.perkOffline')}</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.cta}
                onClick={handleAndroidInstall}
              >
                {t('install.androidCta')}
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

export default translate(InstallAppButton);
