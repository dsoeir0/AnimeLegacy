// Guards the mapping from Firebase Auth error codes to translation keys.
// If Firebase ever renames a code we'll see the fallback in tests first.

import { describe, expect, it } from 'vitest';
import { formatAuthError } from '../lib/utils/authErrors';

// Fake translator that just returns the key — lets us assert on which
// key the mapping picked without loading a real i18n bundle.
const t = (key) => key;

describe('formatAuthError', () => {
  it('maps the documented Firebase auth error codes to i18n keys', () => {
    expect(formatAuthError({ code: 'auth/user-not-found' }, t)).toBe('errors.userNotFound');
    expect(formatAuthError({ code: 'auth/wrong-password' }, t)).toBe('errors.wrongPassword');
    expect(formatAuthError({ code: 'auth/invalid-credential' }, t)).toBe(
      'errors.invalidCredential',
    );
    expect(formatAuthError({ code: 'auth/invalid-email' }, t)).toBe('errors.invalidEmail');
    expect(formatAuthError({ code: 'auth/email-already-in-use' }, t)).toBe('errors.emailInUse');
    expect(formatAuthError({ code: 'auth/weak-password' }, t)).toBe('errors.weakPassword');
    expect(formatAuthError({ code: 'auth/not-configured' }, t)).toBe('errors.notConfigured');
  });

  it('falls back to err.message when the code is unknown', () => {
    expect(
      formatAuthError({ code: 'auth/some-new-code', message: 'Detailed reason.' }, t),
    ).toBe('Detailed reason.');
  });

  it('falls back to generic signInFailed when neither code nor message exist', () => {
    expect(formatAuthError({}, t)).toBe('errors.signInFailed');
    expect(formatAuthError(null, t)).toBe('errors.signInFailed');
    expect(formatAuthError(undefined, t)).toBe('errors.signInFailed');
  });
});
