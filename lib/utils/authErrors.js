export const formatAuthError = (err, t) => {
  const code = err?.code || '';
  if (code === 'auth/user-not-found') return t('errors.userNotFound');
  if (code === 'auth/wrong-password') return t('errors.wrongPassword');
  if (code === 'auth/invalid-credential') return t('errors.invalidCredential');
  if (code === 'auth/invalid-email') return t('errors.invalidEmail');
  if (code === 'auth/email-already-in-use') return t('errors.emailInUse');
  if (code === 'auth/weak-password') return t('errors.weakPassword');
  if (code === 'auth/not-configured') return t('errors.notConfigured');
  return err?.message || t('errors.signInFailed');
};
