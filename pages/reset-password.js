import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import useAuth from '../hooks/useAuth';
import { PASSWORD_RULES, findPasswordRuleError } from '../lib/constants';
import styles from '../components/auth/AuthForms.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading, verifyResetCode, confirmResetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const oobCode = useMemo(() => {
    if (!router.isReady) return '';
    return typeof router.query.oobCode === 'string' ? router.query.oobCode : '';
  }, [router.isReady, router.query.oobCode]);

  const passwordError = findPasswordRuleError(password);
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
        setError(
          err?.code === 'auth/invalid-action-code'
            ? 'This reset link is invalid or has expired.'
            : err?.code === 'auth/not-configured'
              ? 'Password reset is not configured. Add Firebase env vars to enable it.'
              : 'Unable to verify reset link.',
        );
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
      setTimeout(() => router.push('/sign-in'), 3000);
    } catch (err) {
      setError(
        err?.code === 'auth/weak-password'
          ? 'Password is too weak.'
          : err?.code === 'auth/invalid-action-code'
            ? 'This reset link is invalid or has expired.'
            : err?.code === 'auth/not-configured'
              ? 'Password reset is not configured. Add Firebase env vars to enable it.'
              : 'Unable to reset password.',
      );
      setStatus('error');
    }
  };

  const renderBody = () => {
    if (user) {
      return (
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
      );
    }
    if (status === 'verifying') {
      return <p className={styles.subtitle}>Verifying your reset link…</p>;
    }
    if (status === 'success') {
      return (
        <>
          <div className={styles.success}>Password updated. Redirecting to sign in…</div>
          <div className={styles.altLink}>
            <span>Not redirected?</span>
            <Link href="/sign-in">Go to sign in</Link>
          </div>
        </>
      );
    }
    if (status === 'error' && !oobCode) {
      return (
        <>
          <div className={styles.error}>
            Missing reset code. Request a new reset link below.
          </div>
          <Link href="/forgot-password">
            <Button variant="primary" size="md" fullWidth>
              Request a new link
            </Button>
          </Link>
        </>
      );
    }
    if (status === 'ready' || (status === 'error' && oobCode)) {
      return (
        <form onSubmit={handleSubmit} noValidate>
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              New password
            </label>
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
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
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              className={`${styles.input} ${touched.confirm && confirmError ? styles.inputError : ''}`}
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
          <Button variant="primary" size="lg" fullWidth type="submit" icon={ArrowRight} disabled={authLoading}>
            Update password
          </Button>
        </form>
      );
    }
    return null;
  };

  return (
    <AuthShell title="AnimeLegacy · Set new password" description="Set a new password for your AnimeLegacy account.">
      <div className={styles.topBar}>
        <Link href="/sign-in" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
      <div className={styles.formArea}>
        <div className={styles.formWrap}>
          <div className={styles.eyebrow}>ACCOUNT RECOVERY</div>
          <h2 className={styles.heading}>Set a new password.</h2>
          <p className={styles.subtitle}>
            {email ? `Resetting password for ${email}.` : 'Choose a new password for your account.'}
          </p>
          {renderBody()}
        </div>
      </div>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} AnimeLegacy</span>
      </footer>
    </AuthShell>
  );
}
