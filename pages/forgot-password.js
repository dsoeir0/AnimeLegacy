import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Send } from 'lucide-react';
import { translate } from 'react-switch-lang';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import useAuth from '../hooks/useAuth';
import { isValidEmail } from '../lib/constants';
import styles from '../components/auth/AuthForms.module.css';

function ForgotPasswordPage({ t }) {
  const { user, sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const emailError = !email
    ? t('errors.emailRequired')
    : !isValidEmail(email)
      ? t('errors.emailInvalid')
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
      setMessage(t('auth.emailSent'));
    } catch (err) {
      setError(
        err?.code === 'auth/not-configured'
          ? t('errors.resetNotConfigured')
          : err?.message || t('errors.unableSendReset'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => router.push('/sign-in'), 3000);
    return () => clearTimeout(timer);
  }, [message, router]);

  return (
    <AuthShell title="AnimeLegacy · Reset password" description="Reset your AnimeLegacy password.">
      <div className={styles.topBar}>
        <Link href="/sign-in" className={styles.backLink}>
          <ArrowLeft size={14} /> {t('actions.backToSignIn')}
        </Link>
      </div>
      <div className={styles.formArea}>
        <div className={styles.formWrap}>
          <div className={styles.eyebrow}>{t('auth.recoveryEyebrow')}</div>
          <h2 className={styles.heading}>{t('auth.forgotTitle')}</h2>
          <p className={styles.subtitle}>{t('auth.forgotBody')}</p>

          {user ? (
            <div className={styles.signedIn}>
              <p>
                {t('profile.signedInAs')}{' '}
                <strong>{user.displayName || user.email || 'AnimeLegacy User'}</strong>.
              </p>
              <Link href="/my-list">
                <Button variant="primary" size="md" fullWidth>
                  {t('actions.goToMyList')}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  {t('forms.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${touched && emailError ? styles.inputError : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={t('forms.emailPlaceholder')}
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
                {submitting ? t('auth.sending') : t('actions.sendResetLink')}
              </Button>

              {error ? <div className={styles.error}>{error}</div> : null}
              {message ? <div className={styles.success}>{message}</div> : null}

              <div className={styles.altLink}>
                <span>{t('auth.remembered')}</span>
                <Link href="/sign-in">{t('actions.backToSignIn')}</Link>
              </div>
            </form>
          )}
        </div>
      </div>
      <footer className={styles.footer}>
        <span>{t('auth.footerCopy', { year: new Date().getFullYear() })}</span>
      </footer>
    </AuthShell>
  );
}

export default translate(ForgotPasswordPage);
