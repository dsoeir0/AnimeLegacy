import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import useAuth from '../hooks/useAuth';
import styles from '../styles/auth.module.css';

const ResetPasswordPage = () => {
  const { user, loading: authLoading, verifyResetCode, confirmResetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle'); // idle | verifying | ready | success | error
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const oobCode = useMemo(() => {
    if (!router.isReady) return '';
    return typeof router.query.oobCode === 'string' ? router.query.oobCode : '';
  }, [router.isReady, router.query.oobCode]);

  const passwordRules = [
    { id: 'min', label: 'At least 8 characters', test: (value) => value.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
    { id: 'lower', label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
    { id: 'number', label: 'One number', test: (value) => /\d/.test(value) },
    { id: 'symbol', label: 'One symbol', test: (value) => /[^A-Za-z0-9]/.test(value) },
  ];

  const passwordError = passwordRules.find((rule) => !rule.test(password))
    ? 'Password does not meet the required rules.'
    : '';
  const confirmError = !confirmPassword
    ? 'Please confirm your password.'
    : confirmPassword !== password
      ? 'Passwords do not match.'
      : '';
  const isFormValid = !passwordError && !confirmError;

  useEffect(() => {
    if (!oobCode || status !== 'idle') return;
    setStatus('verifying');
    verifyResetCode(oobCode)
      .then((emailAddress) => {
        setEmail(emailAddress);
        setStatus('ready');
      })
      .catch((err) => {
        const msg =
          err?.code === 'auth/invalid-action-code'
            ? 'This reset link is invalid or has expired.'
            : err?.code === 'auth/not-configured'
              ? 'Password reset is not configured. Add Firebase env vars to enable it.'
              : 'Unable to verify reset link.';
        setError(msg);
        setStatus('error');
      });
  }, [oobCode, status, verifyResetCode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ password: true, confirm: true });
    setError('');
    if (!isFormValid) return;
    try {
      await confirmResetPassword(oobCode, password);
      setStatus('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      const msg =
        err?.code === 'auth/weak-password'
          ? 'Password is too weak.'
          : err?.code === 'auth/invalid-action-code'
            ? 'This reset link is invalid or has expired.'
            : err?.code === 'auth/not-configured'
              ? 'Password reset is not configured. Add Firebase env vars to enable it.'
              : 'Unable to reset password.';
      setError(msg);
      setStatus('error');
    }
  };

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - Reset password"
      description="Set a new password for your AnimeLegacy account."
    >
      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.eyebrow}>AnimeLegacy Access</div>
          <h1 className={styles.title}>Set a new password</h1>
          <p className={styles.subtitle}>
            {email ? `Resetting password for ${email}.` : 'Choose a new password for your account.'}
          </p>

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
          ) : status === 'verifying' ? (
            <p className={styles.subtitle}>Verifying your reset link...</p>
          ) : status === 'success' ? (
            <>
              <div className={styles.success}>Password updated. Redirecting to login...</div>
              <div className={styles.altLink}>
                <span>Not redirected?</span>
                <Link href="/login" legacyBehavior>
                  <a>Go to Login</a>
                </Link>
              </div>
            </>
          ) : (
            <>
              {status === 'error' ? <div className={styles.error}>{error}</div> : null}
              {status === 'ready' ? (
                <form className={styles.form} onSubmit={handleSubmit}>
                  <label className={styles.label}>
                    New password
                    <input
                      className={`${styles.input} ${touched.password && passwordError ? styles.inputError : ''}`}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                      placeholder="********"
                      required
                      minLength={8}
                    />
                    {touched.password && passwordError ? (
                      <span className={styles.fieldError}>{passwordError}</span>
                    ) : null}
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
                  </label>
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
                  <button className={styles.primaryAction} type="submit" disabled={authLoading}>
                    Update password
                  </button>
                </form>
              ) : null}
              <div className={styles.altLink}>
                <span>Remembered your password?</span>
                <Link href="/login" legacyBehavior>
                  <a>Back to Login</a>
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
};

export default ResetPasswordPage;
