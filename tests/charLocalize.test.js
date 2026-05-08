import { describe, expect, it } from 'vitest';
import { localizeLanguage, localizeRole } from '../lib/utils/charLocalize';

const tStub = (key) => `T(${key})`;

describe('localizeRole', () => {
  it('maps known roles to their translation key', () => {
    expect(localizeRole('Main', tStub)).toBe('T(character.role.main)');
    expect(localizeRole('Supporting', tStub)).toBe('T(character.role.supporting)');
    expect(localizeRole('Background', tStub)).toBe('T(character.role.background)');
  });

  it('is case-insensitive', () => {
    expect(localizeRole('MAIN', tStub)).toBe('T(character.role.main)');
    expect(localizeRole('main', tStub)).toBe('T(character.role.main)');
  });

  it('falls back to anime.roleLabel when raw is empty', () => {
    expect(localizeRole('', tStub)).toBe('T(anime.roleLabel)');
    expect(localizeRole(null, tStub)).toBe('T(anime.roleLabel)');
    expect(localizeRole(undefined, tStub)).toBe('T(anime.roleLabel)');
  });

  it('returns the raw string when role is unknown', () => {
    expect(localizeRole('Cameo', tStub)).toBe('Cameo');
  });
});

describe('localizeLanguage', () => {
  it('maps known languages to their translation key', () => {
    expect(localizeLanguage('Japanese', tStub)).toBe('T(character.lang.japanese)');
    expect(localizeLanguage('Spanish', tStub)).toBe('T(character.lang.spanish)');
    expect(localizeLanguage('French', tStub)).toBe('T(character.lang.french)');
  });

  it('handles spaces and parentheses (Portuguese (BR))', () => {
    expect(localizeLanguage('Portuguese (BR)', tStub)).toBe(
      'T(character.lang.portugueseBr)',
    );
  });

  it('trims whitespace and lowercases', () => {
    expect(localizeLanguage('  JAPANESE  ', tStub)).toBe('T(character.lang.japanese)');
  });

  it('returns "—" for empty', () => {
    expect(localizeLanguage('', tStub)).toBe('—');
    expect(localizeLanguage(null, tStub)).toBe('—');
  });

  it('returns the raw string when language is unknown', () => {
    expect(localizeLanguage('Klingon', tStub)).toBe('Klingon');
  });
});
