import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from '../ui/Button';
import { PASSWORD_RULES } from '../../lib/constants';
import styles from './AuthForms.module.css';

// The email+password (+confirm for signup) form. Validation state is owned
// by AuthPage — this component is presentational so the page can decide
// when to show errors (onBlur) and when to clear them (mode toggle).
function EmailAuthForm({
  mode,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPw,
  setShowPw,
  rememberMe,
  setRememberMe,
  touched,
  setTouched,
  emailError,
  passwordError,
  confirmError,
  formError,
  submitting,
  authLoading,
  onSubmit,
  t,
}) {
  const submitLabel = submitting
    ? mode === 'signin'
      ? t('auth.signingIn')
      : t('auth.creating')
    : mode === 'signin'
      ? t('actions.signIn')
      : t('auth.createAccount');

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          {t('forms.email')}
        </label>
        <input
          id="email"
          type="email"
          className={`${styles.input} ${touched.email && emailError ? styles.inputError : ''}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, email: true }))}
          placeholder={t('forms.emailPlaceholder')}
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
            {t('forms.password')}
          </label>
          {mode === 'signin' ? (
            <Link href="/forgot-password" className={styles.inlineLink}>
              {t('actions.forgotQuestion')}
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
            placeholder={
              mode === 'signin'
                ? t('forms.passwordPlaceholder')
                : t('forms.passwordPlaceholderNew')
            }
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
        {mode === 'signup' ? (
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
        ) : null}
      </div>

      {mode === 'signup' ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirm">
            {t('forms.confirmPassword')}
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
            placeholder={t('forms.passwordPlaceholderRepeat')}
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
          {mode === 'signin' ? t('forms.remember30') : t('forms.emailSeasons')}
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
        {submitLabel}
      </Button>

      {formError ? <div className={styles.error}>{formError}</div> : null}

      <div className={styles.legal}>{t('auth.legal')}</div>
    </form>
  );
}

export default translate(EmailAuthForm);
