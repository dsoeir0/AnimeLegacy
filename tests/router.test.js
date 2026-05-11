import { describe, it, expect } from 'vitest';
import { currentPath } from '../lib/utils/router.js';

describe('currentPath', () => {
  it('returns the path portion without the query string', () => {
    expect(currentPath({ asPath: '/seasons/2026?s=fall&sort=rating' })).toBe('/seasons/2026');
  });

  it('returns the path unchanged when there is no query string', () => {
    expect(currentPath({ asPath: '/characters' })).toBe('/characters');
  });

  it('returns the path with empty query when query is just "?"', () => {
    expect(currentPath({ asPath: '/search?' })).toBe('/search');
  });

  it('returns an empty string when asPath is undefined', () => {
    expect(currentPath({})).toBe('');
  });

  it('returns an empty string when router is null', () => {
    expect(currentPath(null)).toBe('');
  });

  it('returns an empty string when router is undefined', () => {
    expect(currentPath(undefined)).toBe('');
  });
});
