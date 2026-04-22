import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { deleteUser, updateProfile } from 'firebase/auth';
import { translate } from 'react-switch-lang';
import AlreadySignedInPanel from './AlreadySignedInPanel';
import AuthShell from './AuthShell';
import Button from '../ui/Button';
import EmailAuthForm from './EmailAuthForm';
import GoogleAuthButton from './GoogleAuthButton';
import ProfileCompletionModal, { fileToDataUrl } from './ProfileCompletionModal';
import useAuth from '../../hooks/useAuth';
import { getFirebaseClient } from '../../lib/firebase/client';
import {
  claimUsername,
  getUserProfile,
  upsertUserProfile,
} from '../../lib/services/userProfile';
import { findPasswordRuleError, isValidEmail } from '../../lib/constants';
import { formatAuthError } from '../../lib/utils/authErrors';
import styles from './AuthForms.module.css';

function AuthPage({ initialMode = 'signin', t }) {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
  } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => {
    setError('');
    setTouched({});
  }, [mode]);

  const emailError = !email
    ? t('errors.emailRequired')
    : !isValidEmail(email)
      ? t('errors.emailInvalid')
      : '';
  const passwordError =
    mode === 'signup'
      ? findPasswordRuleError(password)
        ? t('errors.passwordRulesFailed')
        : ''
      : !password
        ? t('errors.passwordRequired')
        : '';
  const confirmError =
    mode === 'signup' && !confirmPassword
      ? t('errors.confirmRequired')
      : mode === 'signup' && confirmPassword !== password
        ? t('errors.passwordsMismatch')
        : '';
  const isFormValid = !emailError && !passwordError && !confirmError;

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
    setTouched({});
  };

  const saveProfile = async ({ username, bio, avatarFile }) => {
    const { auth } = getFirebaseClient();
    if (!auth?.currentUser) {
      setModalError(t('auth.notSignedIn'));
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      const claim = await claimUsername({ uid: auth.currentUser.uid, username });
      if (!claim.ok) {
        setModalError(t('errors.usernameTaken'));
        return;
      }
      const avatarData = avatarFile ? await fileToDataUrl(avatarFile, t) : '';
      await updateProfile(auth.currentUser, { displayName: username, photoURL: null });
      await upsertUserProfile({
        uid: auth.currentUser.uid,
        username,
        bio,
        avatarData,
        email: auth.currentUser.email || '',
        displayName: username,
      });
      setProfileModal(null);
      router.push('/my-list');
    } catch (err) {
      setModalError(err?.message || t('errors.saveFailed'));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      const result = await signInWithGoogle();
      const authUser = result?.user;
      if (!authUser?.uid) return;
      const existing = await getUserProfile(authUser.uid);
      if (!existing?.username) {
        setProfileModal({
          initialUsername:
            authUser.displayName || (authUser.email || '').split('@')[0] || '',
        });
        return;
      }
      await upsertUserProfile({
        uid: authUser.uid,
        username: existing.username,
        bio: existing.bio || '',
        avatarData: existing.avatarData || '',
        email: authUser.email || '',
        displayName: existing.username,
      });
      router.push('/my-list');
    } catch (err) {
      setError(formatAuthError(err, t));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true, confirm: true });
    setError('');
    if (!isFormValid) return;
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        setProfileModal({ initialUsername: email.split('@')[0] || '' });
      } else {
        await signInWithEmail(email, password);
        router.push('/my-list');
      }
    } catch (err) {
      setError(formatAuthError(err, t));
      // If signup succeeded at the Auth layer but the follow-up setup failed,
      // roll back the half-created Firebase user so they can retry from scratch.
      if (mode === 'signup') {
        const { auth } = getFirebaseClient();
        if (auth?.currentUser) {
          try {
            await deleteUser(auth.currentUser);
          } catch {
            await signOutUser();
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !profileModal) {
    return <AlreadySignedInPanel user={user} onSignOut={signOutUser} />;
  }

  return (
    <>
      <AuthShell
        title={
          mode === 'signin'
            ? 'AnimeLegacy · Sign in'
            : 'AnimeLegacy · Create account'
        }
        description={
          mode === 'signin'
            ? 'Sign in to AnimeLegacy and keep your list in sync.'
            : 'Create an AnimeLegacy account to start your chronicle.'
        }
      >
        <div className={styles.topBar}>
          <span className={styles.topBarText}>
            {mode === 'signin' ? t('auth.newToSite') : t('auth.alreadyHave')}
          </span>
          <Button variant="secondary" size="sm" onClick={toggleMode}>
            {mode === 'signin' ? t('auth.createAccount') : t('actions.signIn')}
          </Button>
        </div>

        <div className={styles.formArea}>
          <div className={styles.formWrap}>
            <div className={styles.eyebrow}>
              {mode === 'signin' ? t('auth.signInEyebrow') : t('auth.signUpEyebrow')}
            </div>
            <h2 className={styles.heading}>
              {mode === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle')}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'signin' ? t('auth.signInBody') : t('auth.signUpBody')}
            </p>

            <GoogleAuthButton
              onClick={handleGoogle}
              disabled={authLoading || submitting}
            />

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>{t('auth.dividerOrEmail')}</span>
              <span className={styles.dividerLine} />
            </div>

            <EmailAuthForm
              mode={mode}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPw={showPw}
              setShowPw={setShowPw}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              touched={touched}
              setTouched={setTouched}
              emailError={emailError}
              passwordError={passwordError}
              confirmError={confirmError}
              formError={error}
              submitting={submitting}
              authLoading={authLoading}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        <footer className={styles.footer}>
          <span>{t('auth.footerCopy', { year: new Date().getFullYear() })}</span>
        </footer>
      </AuthShell>

      {profileModal ? (
        <ProfileCompletionModal
          initialUsername={profileModal.initialUsername}
          onClose={() => {
            setProfileModal(null);
            setModalError('');
          }}
          onSubmit={saveProfile}
          submitting={modalSubmitting}
          error={modalError}
        />
      ) : null}
    </>
  );
}

export default translate(AuthPage);
