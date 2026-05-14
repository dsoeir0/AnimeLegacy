import { describe, expect, it } from 'vitest';
import { detectPwaPlatform } from '../lib/utils/pwaPlatform';

describe('detectPwaPlatform', () => {
  it('flags iPhone Safari', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(detectPwaPlatform(ua)).toEqual({
      isIos: true,
      isAndroid: false,
      isMobile: true,
    });
  });

  it('flags iPad', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(detectPwaPlatform(ua)).toMatchObject({ isIos: true, isMobile: true });
  });

  it('flags Android Chrome', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S938B) AppleWebKit/537.36';
    expect(detectPwaPlatform(ua)).toEqual({
      isIos: false,
      isAndroid: true,
      isMobile: true,
    });
  });

  it('returns desktop for Linux Firefox', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0';
    expect(detectPwaPlatform(ua)).toEqual({
      isIos: false,
      isAndroid: false,
      isMobile: false,
    });
  });

  it('returns desktop for macOS Safari', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15';
    expect(detectPwaPlatform(ua).isMobile).toBe(false);
  });

  it('handles empty UA', () => {
    expect(detectPwaPlatform('')).toEqual({
      isIos: false,
      isAndroid: false,
      isMobile: false,
    });
  });

  it('handles null/undefined UA', () => {
    expect(detectPwaPlatform(null).isMobile).toBe(false);
    expect(detectPwaPlatform(undefined).isMobile).toBe(false);
  });
});
