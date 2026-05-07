import { describe, expect, it } from 'vitest';
import {
  applyExtraFilters,
  buildGenreQuery,
  normalizeDecade,
  normalizeScore,
  normalizeSort,
  normalizeStatus,
  normalizeType,
  normalizeView,
  overrideSort,
  sortConfig,
} from '../lib/utils/discoverFilter';

describe('normalizers', () => {
  it('normalizeSort: known keys pass through, others fall to top', () => {
    expect(normalizeSort('top')).toBe('top');
    expect(normalizeSort('new')).toBe('new');
    expect(normalizeSort('az')).toBe('az');
    expect(normalizeSort('popular')).toBe('popular');
    expect(normalizeSort('xxx')).toBe('top');
    expect(normalizeSort(undefined)).toBe('top');
  });

  it('normalizeView: defaults to grid', () => {
    expect(normalizeView('grid')).toBe('grid');
    expect(normalizeView('list')).toBe('list');
    expect(normalizeView('xxx')).toBe('grid');
  });

  it('normalizeType / Status / Decade: empty string for unknown', () => {
    expect(normalizeType('movie')).toBe('movie');
    expect(normalizeType('xxx')).toBe('');
    expect(normalizeStatus('airing')).toBe('airing');
    expect(normalizeStatus('xxx')).toBe('');
    expect(normalizeDecade('2010')).toBe('2010');
    expect(normalizeDecade('pre2000')).toBe('pre2000');
    expect(normalizeDecade('1990')).toBe('');
  });

  it('normalizeScore: stringifies and validates', () => {
    expect(normalizeScore('7')).toBe('7');
    expect(normalizeScore(8)).toBe('8');
    expect(normalizeScore('5')).toBe('');
    expect(normalizeScore(null)).toBe('');
  });
});

describe('overrideSort', () => {
  it('replaces order_by + sort, preserving other params', () => {
    const out = overrideSort('genres=8&order_by=score&sort=desc&type=movie', 'az');
    expect(out).toContain('order_by=title');
    expect(out).toContain('sort=asc');
    expect(out).toContain('genres=8');
    expect(out).toContain('type=movie');
  });

  it('appends order_by + sort when missing from base', () => {
    const out = overrideSort('genres=8', 'top');
    expect(out).toContain('order_by=score');
    expect(out).toContain('sort=desc');
  });

  it('handles empty base string', () => {
    const out = overrideSort('', 'new');
    expect(out).toContain('order_by=start_date');
    expect(out).toContain('sort=desc');
  });

  it('uses sort=top config when key is unknown', () => {
    const out = overrideSort('genres=1&order_by=foo&sort=bar', 'whatever');
    expect(out).toContain(`order_by=${sortConfig.top.order_by}`);
    expect(out).toContain(`sort=${sortConfig.top.sort}`);
  });
});

describe('buildGenreQuery', () => {
  it('builds a fresh genre query with the selected sort', () => {
    expect(buildGenreQuery(1, 'top')).toBe('genres=1&order_by=score&sort=desc');
    expect(buildGenreQuery(8, 'az')).toBe('genres=8&order_by=title&sort=asc');
    expect(buildGenreQuery(7, 'popular')).toBe(
      'genres=7&order_by=popularity&sort=asc',
    );
  });
});

describe('applyExtraFilters', () => {
  it('appends type, status and min_score when set', () => {
    const out = applyExtraFilters('genres=1', {
      type: 'movie',
      status: 'complete',
      minScore: '8',
      sort: 'top',
    });
    expect(out).toContain('type=movie');
    expect(out).toContain('status=complete');
    expect(out).toContain('min_score=8');
  });

  it('omits filters that are empty/falsy', () => {
    const out = applyExtraFilters('genres=1', {
      type: '',
      status: '',
      minScore: '',
      sort: 'top',
    });
    expect(out).toBe('genres=1');
  });

  it('decade overrides start_date + end_date', () => {
    const out = applyExtraFilters('genres=1', {
      decade: '2010',
      sort: 'top',
    });
    expect(out).toContain('start_date=2010-01-01');
    expect(out).toContain('end_date=2019-12-31');
  });

  it('pre2000 decade only sets end_date (no lower bound)', () => {
    const out = applyExtraFilters('genres=1', {
      decade: 'pre2000',
      sort: 'top',
    });
    expect(out).not.toContain('start_date');
    expect(out).toContain('end_date=1999-12-31');
  });

  it('sort=new without decade adds end_date=today', () => {
    const out = applyExtraFilters('genres=1', {
      sort: 'new',
      today: '2026-05-07',
    });
    expect(out).toContain('end_date=2026-05-07');
  });

  it('decade range takes precedence over sort=new today', () => {
    const out = applyExtraFilters('genres=1', {
      sort: 'new',
      decade: '2010',
      today: '2026-05-07',
    });
    expect(out).toContain('end_date=2019-12-31');
    expect(out).not.toContain('end_date=2026-05-07');
  });

  it('preserves base params verbatim at the start', () => {
    const out = applyExtraFilters('genres=1&order_by=score&sort=desc', {
      type: 'tv',
      sort: 'top',
    });
    expect(out.startsWith('genres=1&order_by=score&sort=desc')).toBe(true);
  });
});
