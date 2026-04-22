import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { translate } from 'react-switch-lang';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import useAuth from '../hooks/useAuth';
import { PASSWORD_RULES, findPasswordRuleError } from '../lib/constants';
import styles from '../components/auth/AuthForms.module.css';

function ResetPasswordPage({ t }) {
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

  const passwordError = findPasswordRuleError(password) ? t('errors.passwordRulesFailed') : '';
  const confirmError = !confirmPassword
    ? t('errors.confirmRequired')
    : confirmPassword !== password
      ? t('errors.passwordsMismatch')
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
            ? t('errors.invalidResetLink')
            : err?.code === 'auth/not-configured'
              ? t('errors.resetNotConfigured')
              : t('errors.resetFailed'),
        );
        setStatus('error');
      });
  }, [oobCode, status, verifyResetCode, t]);

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
          ? t('errors.weakPassword')
          : err?.code === 'auth/invalid-action-code'
            ? t('errors.invalidResetLink')
            : err?.code === 'auth/not-configured'
              ? t('errors.resetNotConfigured')
              : t('errors.resetFailed'),
      );
      setStatus('error');
    }
  };

  const renderBody = () => {
    if (user) {
      return (
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
      );
    }
    if (status === 'verifying') {
      return <p className={styles.subtitle}>{t('errors.verifyingLink')}</p>;
    }
    if (status === 'success') {
      return (
        <>
          <div className={styles.success}>{t('auth.resetSuccess')}</div>
          <div className={styles.altLink}>
            <span>{t('auth.notRedirected')}</span>
            <Link href="/sign-in">{t('auth.goToSignIn')}</Link>
          </div>
        </>
      );
    }
    if (status === 'error' && !oobCode) {
      return (
        <>
          <div className={styles.error}>{t('errors.missingResetCode')}</div>
          <Link href="/forgot-password">
            <Button variant="primary" size="md" fullWidth>
              {t('actions.requestNewLink')}
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
              {t('forms.newPassword')}
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
                placeholder={t('forms.passwordPlaceholderNew')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.inputToggle}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? t('actions.hidePassword') : t('actions.showPassword')}
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
                  {t(`passwordRules.${rule.id}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">
              {t('forms.confirmPassword')}
            </label>
            <input
              id="confirm"
              type="password"
              className={`${styles.input} ${touched.confirm && confirmError ? styles.inputError : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
              placeholder={t('forms.passwordPlaceholderRepeat')}
              autoComplete="new-password"
              required
            />
            {touched.confirm && confirmError ? (
              <span className={styles.fieldError}>{confirmError}</span>
            ) : null}
          </div>
          <Button variant="primary" size="lg" fullWidth type="submit" icon={ArrowRight} disabled={authLoading}>
            {t('actions.updatePassword')}
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
          <ArrowLeft size={14} /> {t('actions.backToSignIn')}
        </Link>
      </div>
      <div className={styles.formArea}>
        <div className={styles.formWrap}>
          <div className={styles.eyebrow}>{t('auth.recoveryEyebrow')}</div>
          <h2 className={styles.heading}>{t('auth.resetTitle')}</h2>
          <p className={styles.subtitle}>
            {email ? t('auth.resetBodyFor', { email }) : t('auth.resetBodyDefault')}
          </p>
          {renderBody()}
        </div>
      </div>
      <footer className={styles.footer}>
        <span>{t('auth.footerCopy', { year: new Date().getFullYear() })}</span>
      </footer>
    </AuthShell>
  );
}

export default translate(ResetPasswordPage);
