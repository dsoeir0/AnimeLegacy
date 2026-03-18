import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../layout/Layout';
import useAuth from '../../hooks/useAuth';
import { getFirebaseClient } from '../../lib/firebase/client';
import { claimUsername, getUserProfile, upsertUserProfile } from '../../lib/services/userProfile';
import { deleteUser, updateProfile } from 'firebase/auth';
import styles from '../../styles/auth.module.css';

const AuthPage = ({ title, subtitle, altHref, altLabel, mode = 'login' }) => {
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
  } = useAuth();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  const [touched, setTouched] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalUsername, setModalUsername] = useState('');
  const [modalBio, setModalBio] = useState('');
  const [modalAvatarFile, setModalAvatarFile] = useState(null);
  const [modalAvatarError, setModalAvatarError] = useState('');
  const router = useRouter();
  const MAX_AVATAR_SIZE = 512 * 1024;

  const passwordRules = [
    { id: 'min', label: 'At least 8 characters', test: (value) => value.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
    { id: 'lower', label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
    { id: 'number', label: 'One number', test: (value) => /\d/.test(value) },
    { id: 'symbol', label: 'One symbol', test: (value) => /[^A-Za-z0-9]/.test(value) },
  ];

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      if (!file) resolve('');
      if (file.size > MAX_AVATAR_SIZE) {
        reject(new Error('Avatar must be under 512KB.'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        reject(new Error('Avatar must be an image file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailError = !email
    ? 'Email is required.'
    : !validateEmail(email)
      ? 'Enter a valid email address.'
      : '';
  const passwordError =
    mode === 'signup'
      ? passwordRules.find((rule) => !rule.test(password))
        ? 'Password does not meet the required rules.'
        : ''
      : !password
        ? 'Password is required.'
        : '';
  const confirmError =
    mode === 'signup' && !confirmPassword
      ? 'Please confirm your password.'
      : mode === 'signup' && confirmPassword !== password
        ? 'Passwords do not match.'
        : '';
  const usernameError = mode === 'signup' && !username.trim() ? 'Username is required.' : '';

  const isFormValid = !emailError && !passwordError && !confirmError && !usernameError;

  const formatAuthError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found') return 'No account found for this email.';
    if (code === 'auth/wrong-password') return 'Incorrect password.';
    if (code === 'auth/invalid-credential') {
      return 'Incorrect email or password, or this account was deleted.';
    }
    if (code === 'auth/invalid-email') return 'Email address is invalid.';
    if (code === 'auth/email-already-in-use') return 'An account already exists with this email.';
    if (code === 'auth/weak-password') return 'Password is too weak.';
    return err?.message || 'Unable to sign in right now.';
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const result = await signInWithGoogle();
      const authUser = result?.user;
      if (authUser?.uid) {
        const existing = await getUserProfile(authUser.uid);
        if (!existing?.username) {
          setModalUsername(authUser.displayName || authUser.email || '');
          setModalBio('');
          setModalAvatarFile(null);
          setError('');
          setShowProfileModal(true);
          return;
        }
        await upsertUserProfile({
          uid: authUser.uid,
          username:
            existing.username || authUser.displayName || authUser.email || 'AnimeLegacy User',
          bio: existing.bio || '',
          avatarData: existing.avatarData || '',
          email: authUser.email || '',
          displayName:
            existing.username || authUser.displayName || authUser.email || 'AnimeLegacy User',
        });
      }
      router.push('/my-list');
    } catch (err) {
      const message =
        err?.code === 'auth/not-configured'
          ? 'Sign-in is not configured. Add Firebase env vars to enable login.'
          : formatAuthError(err);
      setError(message);
    }
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setError('');
    setTouched({ email: true, password: true, confirm: true, username: true });
    if (mode === 'signup' && activeTab === 'account') {
      if (!isFormValid) return;
      setActiveTab('profile');
      return;
    }
    if (!isFormValid) return;
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        const { auth } = getFirebaseClient();
        if (auth?.currentUser) {
          const claim = await claimUsername({
            uid: auth.currentUser.uid,
            username: username.trim(),
          });
          if (!claim.ok) {
            setError('Username is already taken.');
            try {
              await deleteUser(auth.currentUser);
            } catch {
              await signOutUser();
            }
            return;
          }
          const avatarData = avatarFile ? await fileToDataUrl(avatarFile) : '';
          await updateProfile(auth.currentUser, {
            displayName: username.trim(),
            photoURL: null,
          });
          await upsertUserProfile({
            uid: auth.currentUser.uid,
            username: username.trim(),
            bio: bio.trim(),
            avatarData,
            email,
            displayName: username.trim(),
          });
        }
      } else {
        await signInWithEmail(email, password);
      }
      router.push('/my-list');
    } catch (err) {
      const message =
        err?.code === 'auth/not-configured'
          ? 'Sign-in is not configured. Add Firebase env vars to enable login.'
          : formatAuthError(err);
      setError(message);
    }
  };

  const handleCompleteProfile = async (event) => {
    event.preventDefault();
    setError('');
    if (!modalUsername.trim()) {
      setError('Username is required.');
      return;
    }
    const { auth } = getFirebaseClient();
    if (!auth?.currentUser) return;
    try {
      const claim = await claimUsername({
        uid: auth.currentUser.uid,
        username: modalUsername.trim(),
      });
      if (!claim.ok) {
        setError('Username is already taken.');
        return;
      }
      const existing = await getUserProfile(auth.currentUser.uid);
      const avatarData = modalAvatarFile
        ? await fileToDataUrl(modalAvatarFile)
        : existing?.avatarData || '';
      await updateProfile(auth.currentUser, {
        displayName: modalUsername.trim(),
        photoURL: null,
      });
      await upsertUserProfile({
        uid: auth.currentUser.uid,
        username: modalUsername.trim(),
        bio: modalBio.trim(),
        avatarData,
        email: auth.currentUser.email || '',
        displayName: modalUsername.trim(),
      });
      setShowProfileModal(false);
      router.push('/my-list');
    } catch (err) {
      setError(err?.message || 'Unable to save profile.');
    }
  };

  const signupAvatarPreview = useMemo(() => {
    if (!avatarFile) return '';
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  const modalAvatarPreview = useMemo(() => {
    if (!modalAvatarFile) return '';
    return URL.createObjectURL(modalAvatarFile);
  }, [modalAvatarFile]);

  useEffect(() => {
    return () => {
      if (signupAvatarPreview) URL.revokeObjectURL(signupAvatarPreview);
    };
  }, [signupAvatarPreview]);

  useEffect(() => {
    return () => {
      if (modalAvatarPreview) URL.revokeObjectURL(modalAvatarPreview);
    };
  }, [modalAvatarPreview]);

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title={`AnimeLegacy - ${title}`}
      description={`${title} to manage your watchlist and keep your anime synced.`}
    >
      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.eyebrow}>AnimeLegacy Access</div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>

          {user ? (
            <div className={styles.signedIn}>
              <p>
                You're already signed in as{' '}
                <strong>{user.displayName || user.email || 'AnimeLegacy User'}</strong>.
              </p>
              <Link href="/my-list" legacyBehavior>
                <a className={styles.primaryAction}>Go to My List</a>
              </Link>
            </div>
          ) : (
            <>
              <form className={styles.form} onSubmit={handleEmailAuth}>
                {mode === 'signup' ? (
                  <label className={styles.label}>
                    Username
                    <input
                      className={`${styles.input} ${touched.username && usernameError ? styles.inputError : ''}`}
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
                      placeholder="ZenithRunner"
                      required
                    />
                    {touched.username && usernameError ? (
                      <span className={styles.fieldError}>{usernameError}</span>
                    ) : null}
                  </label>
                ) : null}
                {mode !== 'signup' || activeTab === 'account' ? (
                  <label className={styles.label}>
                    Email
                    <input
                      className={`${styles.input} ${touched.email && emailError ? styles.inputError : ''}`}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                      placeholder="you@example.com"
                      required
                    />
                    {touched.email && emailError ? (
                      <span className={styles.fieldError}>{emailError}</span>
                    ) : null}
                  </label>
                ) : null}
                {mode !== 'signup' || activeTab === 'account' ? (
                  <label className={styles.label}>
                    Password
                    <input
                      className={`${styles.input} ${touched.password && passwordError ? styles.inputError : ''}`}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                      placeholder="********"
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                    />
                    {touched.password && passwordError ? (
                      <span className={styles.fieldError}>{passwordError}</span>
                    ) : null}
                    {mode === 'signup' ? (
                      <ul className={styles.ruleList}>
                        {passwordRules.map((rule) => (
                          <li
                            key={rule.id}
                            className={`${styles.ruleItem} ${rule.test(password) ? styles.rulePassed : ''}`}
                          >
                            {rule.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </label>
                ) : null}
                {mode === 'login' ? (
                  <Link href="/forgot-password" legacyBehavior>
                    <a className={styles.linkButton}>Forgot password?</a>
                  </Link>
                ) : null}
                {mode === 'signup' && activeTab === 'account' ? (
                  <label className={styles.label}>
                    Confirm password
                    <input
                      className={`${styles.input} ${touched.confirm && confirmError ? styles.inputError : ''}`}
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                      placeholder="********"
                      required
                      minLength={8}
                    />
                    {touched.confirm && confirmError ? (
                      <span className={styles.fieldError}>{confirmError}</span>
                    ) : null}
                  </label>
                ) : null}
                {mode === 'signup' && activeTab === 'profile' ? (
                  <div className={styles.avatarCenter}>
                    <div className={styles.avatarCircle}>
                      {signupAvatarPreview ? (
                        <img src={signupAvatarPreview} alt="Profile preview" />
                      ) : (
                        <i className={`bi bi-plus-lg ${styles.avatarIcon}`} aria-hidden="true" />
                      )}
                    </div>
                  </div>
                ) : null}
                {mode === 'signup' && activeTab === 'profile' ? (
                  <label className={styles.label}>
                    Profile picture
                    <div className={styles.fileRow}>
                      <input
                        className={styles.fileInput}
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setAvatarError('');
                          if (file && file.size > MAX_AVATAR_SIZE) {
                            setAvatarError('Avatar must be under 512KB.');
                            setAvatarFile(null);
                            return;
                          }
                          if (file && !file.type.startsWith('image/')) {
                            setAvatarError('Avatar must be an image file.');
                            setAvatarFile(null);
                            return;
                          }
                          setAvatarFile(file);
                        }}
                      />
                      <button
                        className={styles.removeInline}
                        type="button"
                        onClick={() => setAvatarFile(null)}
                        disabled={!avatarFile}
                      >
                        Remove
                      </button>
                    </div>
                  </label>
                ) : null}
                {mode === 'signup' && activeTab === 'profile' ? (
                  <label className={styles.label}>
                    Bio
                    <textarea
                      className={styles.textarea}
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="A quick line about your anime taste."
                      rows={3}
                    />
                  </label>
                ) : null}
                {mode === 'signup' && activeTab === 'profile' && avatarError ? (
                  <div className={styles.error}>{avatarError}</div>
                ) : null}
                <div className={styles.formActions}>
                  {mode === 'signup' && activeTab === 'profile' ? (
                    <button
                      className={styles.secondaryAction}
                      type="button"
                      onClick={() => setActiveTab('account')}
                    >
                      Back
                    </button>
                  ) : null}
                  <button className={styles.primaryAction} type="submit" disabled={authLoading}>
                    {mode === 'signup'
                      ? activeTab === 'account'
                        ? 'Next'
                        : 'Create account'
                      : 'Login with email'}
                  </button>
                </div>
              </form>
              <div className={styles.divider}>or</div>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
              >
                Continue with Google
              </button>
              {error ? <div className={styles.error}>{error}</div> : null}
              <div className={styles.altLink}>
                <span>Need the other page?</span>
                <Link href={altHref} legacyBehavior>
                  <a>{altLabel}</a>
                </Link>
              </div>
            </>
          )}
        </section>
        {showProfileModal ? (
          <div className={styles.modalOverlay}>
            <div
              className={styles.modalCard}
              role="dialog"
              aria-modal="true"
              aria-label="Complete profile"
            >
              <div className={styles.modalHeader}>
                <h2>Complete your profile</h2>
                <p>Add a username and profile photo to finish setup.</p>
              </div>
              <form className={styles.form} onSubmit={handleCompleteProfile}>
                <label className={styles.label}>
                  Username
                  <input
                    className={styles.input}
                    type="text"
                    value={modalUsername}
                    onChange={(event) => setModalUsername(event.target.value)}
                    placeholder="ZenithRunner"
                    required
                  />
                </label>
                <div className={styles.avatarCenter}>
                  <div className={styles.avatarCircle}>
                    {modalAvatarPreview ? (
                      <img src={modalAvatarPreview} alt="Profile preview" />
                    ) : (
                      <i className={`bi bi-plus-lg ${styles.avatarIcon}`} aria-hidden="true" />
                    )}
                  </div>
                </div>
                <label className={styles.label}>
                  Profile picture
                  <div className={styles.fileRow}>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setModalAvatarError('');
                        if (file && file.size > MAX_AVATAR_SIZE) {
                          setModalAvatarError('Avatar must be under 512KB.');
                          setModalAvatarFile(null);
                          return;
                        }
                        if (file && !file.type.startsWith('image/')) {
                          setModalAvatarError('Avatar must be an image file.');
                          setModalAvatarFile(null);
                          return;
                        }
                        setModalAvatarFile(file);
                      }}
                    />
                    <button
                      className={styles.removeInline}
                      type="button"
                      onClick={() => setModalAvatarFile(null)}
                      disabled={!modalAvatarFile}
                    >
                      Remove
                    </button>
                  </div>
                </label>
                <label className={styles.label}>
                  Bio
                  <textarea
                    className={styles.textarea}
                    value={modalBio}
                    onChange={(event) => setModalBio(event.target.value)}
                    placeholder="A quick line about your anime taste."
                    rows={3}
                  />
                </label>
                {modalAvatarError ? <div className={styles.error}>{modalAvatarError}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                <div className={styles.formActions}>
                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={() => {
                      setError('');
                      setShowProfileModal(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button className={styles.primaryAction} type="submit">
                    Save profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </Layout>
  );
};

export default AuthPage;
