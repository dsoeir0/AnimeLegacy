import { useEffect, useMemo, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { X } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import DangerZone from './DangerZone';
import IconButton from '../ui/IconButton';
import { getFirebaseClient } from '../../lib/firebase/client';
import {
  claimUsername,
  getUserProfile,
  upsertUserProfile,
} from '../../lib/services/userProfile';
import { MAX_AVATAR_SIZE_BYTES, MAX_AVATAR_SIZE_LABEL } from '../../lib/constants';
import styles from './profile.module.css';

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms),
    ),
  ]);

// Encapsulates the whole edit flow: form state, avatar preview lifecycle,
// the username-claim race, and the final upsert. The page only needs to
// tell this component when to open/close and who the current user/profile
// is — it takes over the rest.
function EditProfileModal({
  user,
  profile,
  avatar,
  displayName,
  initials,
  onClose,
  t,
}) {
  const [editUsername, setEditUsername] = useState(
    profile?.username || user?.displayName || '',
  );
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const editPreview = useMemo(() => {
    if (!editAvatarFile) return '';
    return URL.createObjectURL(editAvatarFile);
  }, [editAvatarFile]);

  useEffect(() => () => editPreview && URL.revokeObjectURL(editPreview), [editPreview]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user?.uid) return;
    if (!editUsername.trim()) {
      setEditError(t('errors.usernameRequired'));
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const current = await withTimeout(getUserProfile(user.uid), 15000, 'Profile load');
      if (current?.usernameLower !== editUsername.trim().toLowerCase()) {
        const claim = await withTimeout(
          claimUsername({ uid: user.uid, username: editUsername.trim() }),
          15000,
          'Username check',
        );
        if (!claim.ok) {
          setEditError(t('errors.usernameTaken'));
          setSaving(false);
          return;
        }
      }
      let resolvedAvatar = current?.avatarData || '';
      if (removeAvatar) resolvedAvatar = '';
      if (editAvatarFile) {
        if (editAvatarFile.size > MAX_AVATAR_SIZE_BYTES) {
          setEditError(t('errors.avatarTooBig', { size: MAX_AVATAR_SIZE_LABEL }));
          setSaving(false);
          return;
        }
        const reader = new FileReader();
        resolvedAvatar = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(t('errors.avatarReadFailed')));
          reader.readAsDataURL(editAvatarFile);
        });
      }
      const { auth } = getFirebaseClient();
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: editUsername.trim(),
          photoURL: null,
        });
      }
      await withTimeout(
        upsertUserProfile({
          uid: user.uid,
          username: editUsername.trim(),
          bio: editBio.trim(),
          avatarData: resolvedAvatar,
          email: user.email || '',
          displayName: editUsername.trim(),
        }),
        15000,
        'Profile save',
      );
      onClose();
    } catch (err) {
      setEditError(err?.message || t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalEyebrow}>{t('profile.modalSettings')}</div>
            <h2 className={styles.modalTitle}>{t('profile.modalTitle')}</h2>
          </div>
          <IconButton icon={X} tooltip={t('actions.close')} onClick={onClose} />
        </div>
        <form className={styles.modalForm} onSubmit={handleSaveProfile}>
          <div className={styles.modalAvatarRow}>
            <div className={styles.modalAvatarCircle}>
              {editPreview ? (
                <img src={editPreview} alt="" />
              ) : avatar ? (
                <img src={avatar} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={styles.modalAvatarStack}>
              <input
                type="file"
                accept="image/*"
                className={styles.modalFile}
                onChange={(e) => {
                  setEditAvatarFile(e.target.files?.[0] || null);
                  setRemoveAvatar(false);
                }}
              />
              <button
                type="button"
                className={styles.modalLinkBtn}
                onClick={() => {
                  setEditAvatarFile(null);
                  setRemoveAvatar(true);
                }}
                disabled={!avatar && !editPreview}
              >
                {t('actions.removePhoto')}
              </button>
            </div>
          </div>

          <label className={styles.modalLabel}>
            {t('forms.username')}
            <input
              className={styles.modalInput}
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              required
            />
          </label>
          <label className={styles.modalLabel}>
            {t('forms.bio')}
            <textarea
              className={styles.modalTextarea}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
            />
          </label>

          {editError ? <div className={styles.modalError}>{editError}</div> : null}

          <div className={styles.modalActions}>
            <Button variant="ghost" size="md" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              {saving ? t('actions.saving') : t('actions.saveChanges')}
            </Button>
          </div>

          <DangerZone
            username={profile?.username || displayName}
            onClosed={onClose}
          />
        </form>
      </div>
    </div>
  );
}

export default translate(EditProfileModal);
