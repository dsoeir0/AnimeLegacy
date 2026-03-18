import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import useAuth from '../hooks/useAuth';
import styles from '../styles/auth.module.css';

const ForgotPasswordPage = () => {
  const { user, sendPasswordReset } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailError = !email
    ? 'Email is required.'
    : !validateEmail(email)
      ? 'Enter a valid email address.'
      : '';
  const getResetUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/reset-password`;
    }
    return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setTouched(true);
    if (emailError) return;
    try {
      setSubmitting(true);
      await sendPasswordReset(email, { url: getResetUrl(), handleCodeInApp: true });
      setMessage('Password reset email sent. Check your inbox.');
    } catch (err) {
      const msg =
        err?.code === 'auth/not-configured'
          ? 'Password reset is not configured. Add Firebase env vars to enable it.'
          : err?.message || 'Unable to send reset email right now.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      router.push('/sign-in');
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, router]);

  return (
    <Layout
      showSidebar={false}
      headerVariant="dark"
      layoutVariant="dark"
      title="AnimeLegacy - Password reset"
      description="Reset your AnimeLegacy password."
    >
      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.eyebrow}>AnimeLegacy Access</div>
          <h1 className={styles.title}>Reset password</h1>
          <p className={styles.subtitle}>Enter your email to receive a password reset link.</p>

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
              <form className={styles.form} onSubmit={handleReset}>
                <label className={styles.label}>
                  Email
                  <input
                    className={`${styles.input} ${touched && emailError ? styles.inputError : ''}`}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="you@example.com"
                    required
                  />
                  {touched && emailError ? (
                    <span className={styles.fieldError}>{emailError}</span>
                  ) : null}
                </label>
                <button className={styles.primaryAction} type="submit" disabled={submitting}>
                  Send reset link
                </button>
              </form>
              {error ? <div className={styles.error}>{error}</div> : null}
              {message ? <div className={styles.success}>{message}</div> : null}
              <div className={styles.altLink}>
                <span>Remembered your password?</span>
                <Link href="/sign-in" legacyBehavior>
                  <a>Back to Sign in</a>
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
};

export default ForgotPasswordPage;
