// Project-wide constants. Shared limits, rules, and magic numbers live here
// so changes propagate consistently across auth, profile, and list pages.

export const FAVORITE_LIMIT = 10;

export const MAX_AVATAR_SIZE_BYTES = 512 * 1024;
export const MAX_AVATAR_SIZE_LABEL = '512KB';

export const FAVORITE_LIMIT_MESSAGE = `You already have ${FAVORITE_LIMIT} favorites. Remove one to add another.`;

export const PASSWORD_RULES = [
  { id: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'One number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'One symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value) => EMAIL_REGEX.test(String(value || ''));

export const findPasswordRuleError = (value) => {
  const failing = PASSWORD_RULES.find((rule) => !rule.test(value || ''));
  return failing ? 'Password does not meet the required rules.' : '';
};
