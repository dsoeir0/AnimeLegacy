import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Eye, EyeOff, Sparkles, Plus } from 'lucide-react';
import { deleteUser, updateProfile } from 'firebase/auth';
import AuthShell from './AuthShell';
import Button from '../ui/Button';
import useAuth from '../../hooks/useAuth';
import { getFirebaseClient } from '../../lib/firebase/client';
import { claimUsername, getUserProfile, upsertUserProfile } from '../../lib/services/userProfile';
import {
  PASSWORD_RULES,
  MAX_AVATAR_SIZE_BYTES,
  MAX_AVATAR_SIZE_LABEL,
  isValidEmail,
  findPasswordRuleError,
} from '../../lib/constants';
import styles from './AuthForms.module.css';

const formatAuthError = (err) => {
  const code = err?.code || '';
  if (code === 'auth/user-not-found') return 'No account found for this email.';
  if (code === 'auth/wrong-password') return 'Incorrect password.';
  if (code === 'auth/invalid-credential') return 'Incorrect email or password, or this account was deleted.';
  if (code === 'auth/invalid-email') return 'Email address is invalid.';
  if (code === 'auth/email-already-in-use') return 'An account already exists with this email.';
  if (code === 'auth/weak-password') return 'Password is too weak.';
  if (code === 'auth/not-configured') return 'Sign-in is not configured. Add Firebase env vars to enable login.';
  return err?.message || 'Unable to sign in right now.';
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return reject(new Error(`Avatar must be under ${MAX_AVATAR_SIZE_LABEL}.`));
    }
    if (!file.type.startsWith('image/')) return reject(new Error('Avatar must be an image file.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

function ProfileCompletionModal({ initialUsername = '', onClose, onSubmit, submitting, error }) {
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : ''), [avatarFile]);

  useEffect(() => () => avatarPreview && URL.revokeObjectURL(avatarPreview), [avatarPreview]);

  const handleFile = (event) => {
    const file = event.target.files?.[0] || null;
    setAvatarError('');
    if (file && file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(`Avatar must be under ${MAX_AVATAR_SIZE_LABEL}.`);
      setAvatarFile(null);
      return;
    }
    if (file && !file.type.startsWith('image/')) {
      setAvatarError('Avatar must be an image file.');
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
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>Complete your profile</h2>
          <p>Add a username, bio, and avatar to finish setup.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.avatarCenter}>
            <div className={styles.avatarCircle}>
              {avatarPreview ? <img src={avatarPreview} alt="Avatar preview" /> : <Plus size={24} />}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ZenithRunner"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Avatar</label>
            <div className={styles.fileRow}>
              <input type="file" accept="image/*" className={styles.fileInput} onChange={handleFile} />
              <button
                type="button"
                className={styles.removeInline}
                onClick={() => setAvatarFile(null)}
                disabled={!avatarFile}
              >
                Remove
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A quick line about your anime taste."
            />
          </div>
          {avatarError ? <div className={styles.error}>{avatarError}</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.formActions}>
            <Button variant="ghost" size="md" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={submitting || !username.trim()}>
              {submitting ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AuthPage({ initialMode = 'signin' }) {
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
    ? 'Email is required.'
    : !isValidEmail(email)
      ? 'Enter a valid email address.'
      : '';
  const passwordError =
    mode === 'signup'
      ? findPasswordRuleError(password)
      : !password
        ? 'Password is required.'
        : '';
  const confirmError =
    mode === 'signup' && !confirmPassword
      ? 'Please confirm your password.'
      : mode === 'signup' && confirmPassword !== password
        ? 'Passwords do not match.'
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
      setModalError('Not signed in.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      const claim = await claimUsername({ uid: auth.currentUser.uid, username });
      if (!claim.ok) {
        setModalError('Username is already taken.');
        return;
      }
      const avatarData = avatarFile ? await fileToDataUrl(avatarFile) : '';
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
      setModalError(err?.message || 'Unable to save profile.');
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
          initialUsername: authUser.displayName || (authUser.email || '').split('@')[0] || '',
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
      setError(formatAuthError(err));
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
        setProfileModal({
          initialUsername: email.split('@')[0] || '',
        });
      } else {
        await signInWithEmail(email, password);
        router.push('/my-list');
      }
    } catch (err) {
      setError(formatAuthError(err));
      // If signup created a user but we failed later, make sure we clean up session
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

  // Already signed in — show a brief CTA
  if (user && !profileModal) {
    return (
      <AuthShell title="AnimeLegacy · Welcome back">
        <div className={styles.topBar} />
        <div className={styles.formArea}>
          <div className={styles.formWrap}>
            <div className={styles.eyebrow}>ALREADY SIGNED IN</div>
            <h2 className={styles.heading}>Welcome back.</h2>
            <div className={styles.signedIn}>
              <p>
                You&apos;re signed in as{' '}
                <strong>{user.displayName || user.email || 'AnimeLegacy User'}</strong>.
              </p>
              <Link href="/my-list">
                <Button variant="primary" size="md" fullWidth icon={ArrowRight}>
                  Go to my list
                </Button>
              </Link>
            </div>
            <div className={styles.altLink}>
              <span>Not you?</span>
              <button
                type="button"
                onClick={signOutUser}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--al-primary-ink)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <>
      <AuthShell
        title={mode === 'signin' ? 'AnimeLegacy · Sign in' : 'AnimeLegacy · Create account'}
        description={
          mode === 'signin'
            ? 'Sign in to AnimeLegacy and keep your list in sync.'
            : 'Create an AnimeLegacy account to start your chronicle.'
        }
      >
        <div className={styles.topBar}>
          <span className={styles.topBarText}>
            {mode === 'signin' ? 'New to AnimeLegacy?' : 'Already have an account?'}
          </span>
          <Button variant="secondary" size="sm" onClick={toggleMode}>
            {mode === 'signin' ? 'Create account' : 'Sign in'}
          </Button>
        </div>

        <div className={styles.formArea}>
          <div className={styles.formWrap}>
            <div className={styles.eyebrow}>
              {mode === 'signin' ? 'SIGN IN · WELCOME BACK' : 'CREATE ACCOUNT · START YOUR LIST'}
            </div>
            <h2 className={styles.heading}>
              {mode === 'signin' ? 'Pick up where you left off.' : 'Start your chronicle.'}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'signin'
                ? 'Your list, progress, favorites, and ratings — synced across every device.'
                : 'A free account gives you a personal list, rating tools, and weekly seasonal recaps.'}
            </p>

            <button
              type="button"
              className={styles.googleBtn}
              onClick={handleGoogle}
              disabled={authLoading || submitting}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Continue with Google
            </button>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>OR WITH EMAIL</span>
              <span className={styles.dividerLine} />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${touched.email && emailError ? styles.inputError : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                {touched.email && emailError ? (
                  <span className={styles.fieldError}>{emailError}</span>
                ) : null}
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHead}>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  {mode === 'signin' ? (
                    <Link href="/forgot-password" className={styles.inlineLink}>
                      Forgot?
                    </Link>
                  ) : null}
                </div>
                <div className={styles.inputWrap}>
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    className={`${styles.input} ${styles.passwordInput} ${
                      touched.password && passwordError ? styles.inputError : ''
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    placeholder={mode === 'signin' ? 'Enter your password' : 'At least 8 characters'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    className={styles.inputToggle}
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.password && passwordError ? (
                  <span className={styles.fieldError}>{passwordError}</span>
                ) : null}
                {mode === 'signup' ? (
                  <ul className={styles.ruleList}>
                    {PASSWORD_RULES.map((rule) => (
                      <li
                        key={rule.id}
                        className={`${styles.ruleItem} ${rule.test(password) ? styles.rulePassed : ''}`}
                      >
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {mode === 'signup' ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="confirm">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    className={`${styles.input} ${
                      touched.confirm && confirmError ? styles.inputError : ''
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    required
                  />
                  {touched.confirm && confirmError ? (
                    <span className={styles.fieldError}>{confirmError}</span>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.checkRow}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {mode === 'signin' ? 'Remember me for 30 days' : 'Email me about new seasons'}
                </label>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                type="submit"
                icon={mode === 'signin' ? ArrowRight : Sparkles}
                disabled={submitting || authLoading}
              >
                {submitting
                  ? mode === 'signin'
                    ? 'Signing in…'
                    : 'Creating account…'
                  : mode === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
              </Button>

              {error ? <div className={styles.error}>{error}</div> : null}

              <div className={styles.legal}>
                Your list, ratings, and progress are stored securely against your account.
              </div>
            </form>
          </div>
        </div>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} AnimeLegacy</span>
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
