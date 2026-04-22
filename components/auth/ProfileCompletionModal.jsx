import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import {
  MAX_AVATAR_SIZE_BYTES,
  MAX_AVATAR_SIZE_LABEL,
} from '../../lib/constants';
import styles from './AuthForms.module.css';

// Shared helper: caller (AuthPage) converts the picked file to a data URL
// before handing it to upsertUserProfile. Centralised so the size/type
// validation stays in sync with the avatar helper text.
export const fileToDataUrl = (file, t) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return reject(
        new Error(t('errors.avatarTooBig', { size: MAX_AVATAR_SIZE_LABEL })),
      );
    }
    if (!file.type.startsWith('image/')) {
      return reject(new Error(t('errors.avatarNotImage')));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(t('errors.avatarReadFailed')));
    reader.readAsDataURL(file);
  });

function ProfileCompletionModal({
  initialUsername = '',
  onClose,
  onSubmit,
  submitting,
  error,
  t,
}) {
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : ''),
    [avatarFile],
  );

  useEffect(
    () => () => avatarPreview && URL.revokeObjectURL(avatarPreview),
    [avatarPreview],
  );

  const handleFile = (event) => {
    const file = event.target.files?.[0] || null;
    setAvatarError('');
    if (file && file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(t('errors.avatarTooBig', { size: MAX_AVATAR_SIZE_LABEL }));
      setAvatarFile(null);
      return;
    }
    if (file && !file.type.startsWith('image/')) {
      setAvatarError(t('errors.avatarNotImage'));
      setAvatarFile(null);
      return;
    }
    setAvatarFile(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    onSubmit({ username: username.trim(), bio: bio.trim(), avatarFile });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2>{t('auth.completeProfileTitle')}</h2>
          <p>{t('auth.completeProfileBody')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.avatarCenter}>
            <div className={styles.avatarCircle}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" />
              ) : (
                <Plus size={24} />
              )}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('forms.username')}</label>
            <input
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('forms.usernamePlaceholder')}
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('forms.avatar')}</label>
            <div className={styles.fileRow}>
              <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleFile}
              />
              <button
                type="button"
                className={styles.removeInline}
                onClick={() => setAvatarFile(null)}
                disabled={!avatarFile}
              >
                {t('actions.remove')}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('forms.bio')}</label>
            <textarea
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder={t('forms.bioPlaceholder')}
            />
          </div>
          {avatarError ? <div className={styles.error}>{avatarError}</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.formActions}>
            <Button variant="ghost" size="md" onClick={onClose} type="button">
              {t('actions.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={submitting || !username.trim()}
            >
              {submitting ? t('actions.saving') : t('actions.saveProfile')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default translate(ProfileCompletionModal);
