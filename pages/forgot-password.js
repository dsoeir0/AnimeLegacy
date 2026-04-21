import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Send } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import useAuth from '../hooks/useAuth';
import { isValidEmail } from '../lib/constants';
import styles from '../components/auth/AuthForms.module.css';

export default function ForgotPasswordPage() {
  const { user, sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const emailError = !email
    ? 'Email is required.'
    : !isValidEmail(email)
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
      setError(
        err?.code === 'auth/not-configured'
          ? 'Password reset is not configured. Add Firebase env vars to enable it.'
          : err?.message || 'Unable to send reset email right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => router.push('/sign-in'), 3000);
    return () => clearTimeout(t);
  }, [message, router]);

  return (
    <AuthShell title="AnimeLegacy · Reset password" description="Reset your AnimeLegacy password.">
      <div className={styles.topBar}>
        <Link href="/sign-in" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
      <div className={styles.formArea}>
        <div className={styles.formWrap}>
          <div className={styles.eyebrow}>ACCOUNT RECOVERY</div>
          <h2 className={styles.heading}>Reset your password.</h2>
          <p className={styles.subtitle}>
            Enter the email tied to your account and we will send a reset link.
          </p>

          {user ? (
            <div className={styles.signedIn}>
              <p>
                You&apos;re already signed in as{' '}
                <strong>{user.displayName || user.email || 'AnimeLegacy User'}</strong>.
              </p>
              <Link href="/my-list">
                <Button variant="primary" size="md" fullWidth>
                  Go to my list
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${touched && emailError ? styles.inputError : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                {touched && emailError ? (
                  <span className={styles.fieldError}>{emailError}</span>
                ) : null}
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                type="submit"
                icon={Send}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>

              {error ? <div className={styles.error}>{error}</div> : null}
              {message ? <div className={styles.success}>{message}</div> : null}

              <div className={styles.altLink}>
                <span>Remembered it?</span>
                <Link href="/sign-in">Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} AnimeLegacy</span>
      </footer>
    </AuthShell>
  );
}
