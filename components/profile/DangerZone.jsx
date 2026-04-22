import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import useAuth from '../../hooks/useAuth';
import { getFirebaseClient } from '../../lib/firebase/client';
import styles from './profile.module.css';

// Delete-account danger zone inside the profile edit modal. Two-step:
// 1. Click "Delete account" → confirmation pane expands with a typed check
// 2. User types their exact username → the final red button activates
//
// Behaviour of /api/delete-account:
//   - 200: full auto-delete succeeded → sign out + redirect home
//   - 503 { fallback: '/privacy' }: Admin SDK not configured → show a note
//       pointing the user to the manual email flow
//   - other: surface the error message in red

function DangerZone({ username, onClosed, t }) {
  const router = useRouter();
  const { signOutUser } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [manualFallback, setManualFallback] = useState(false);

  const canConfirm = typed.trim() === (username || '').trim() && (username || '').trim().length > 0;

  const handleDelete = async () => {
    setError('');
    setManualFallback(false);
    setDeleting(true);
    try {
      const { auth } = getFirebaseClient();
      const current = auth?.currentUser;
      if (!current) {
        setError(t('auth.notSignedIn'));
        return;
      }
      const token = await current.getIdToken();
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 503) {
        setManualFallback(true);
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || t('profile.danger.failed'));
        return;
      }
      // Success. Sign out locally (the Auth user is already gone server-side)
      // and take them back to the home page.
      await signOutUser();
      if (onClosed) onClosed();
      router.replace('/');
    } catch (err) {
      setError(err?.message || t('profile.danger.failed'));
    } finally {
      setDeleting(false);
    }
  };

  if (manualFallback) {
    return (
      <div className={`${styles.dangerZone} ${styles.dangerFallback}`}>
        <div className={styles.dangerHead}>
          <AlertTriangle size={16} className={styles.dangerIcon} />
          <div>
            <div className={styles.dangerTitle}>{t('profile.danger.manualTitle')}</div>
            <p className={styles.dangerText}>{t('profile.danger.manualBody')}</p>
          </div>
        </div>
        <div className={styles.dangerActions}>
          <Link href="/privacy">
            <Button variant="secondary" size="sm">
              {t('profile.danger.goToPrivacy')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className={styles.dangerZone}>
        <div className={styles.dangerHead}>
          <AlertTriangle size={16} className={styles.dangerIcon} />
          <div>
            <div className={styles.dangerTitle}>{t('profile.danger.title')}</div>
            <p className={styles.dangerText}>{t('profile.danger.body')}</p>
          </div>
        </div>
        <div className={styles.dangerActions}>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setExpanded(true)}
          >
            {t('profile.danger.openCta')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dangerZone} ${styles.dangerExpanded}`}>
      <div className={styles.dangerHead}>
        <AlertTriangle size={16} className={styles.dangerIcon} />
        <div>
          <div className={styles.dangerTitle}>{t('profile.danger.confirmTitle')}</div>
          <p className={styles.dangerText}>
            {t('profile.danger.confirmBody', { username: username || '—' })}
          </p>
        </div>
      </div>
      <input
        type="text"
        className={styles.dangerInput}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={username || ''}
        autoComplete="off"
      />
      {error ? <div className={styles.modalError}>{error}</div> : null}
      <div className={styles.dangerActions}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpanded(false);
            setTyped('');
            setError('');
          }}
        >
          {t('actions.cancel')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={handleDelete}
          disabled={!canConfirm || deleting}
        >
          {deleting ? t('profile.danger.deleting') : t('profile.danger.confirmCta')}
        </Button>
      </div>
    </div>
  );
}

export default translate(DangerZone);
