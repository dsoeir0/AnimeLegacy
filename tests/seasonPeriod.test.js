import { describe, it, expect } from 'vitest';
import { computePeriodKpi } from '../lib/utils/season.js';

describe('computePeriodKpi', () => {
  it('returns ended when now is after the season end', () => {
    const now = new Date(2026, 5, 1);
    expect(computePeriodKpi('season', 'winter', 2025, now)).toEqual({ kind: 'ended' });
  });

  it('returns upcoming with positive days when now is before the season start', () => {
    const now = new Date(2026, 0, 1);
    const result = computePeriodKpi('season', 'fall', 2026, now);
    expect(result.kind).toBe('upcoming');
    expect(result.days).toBeGreaterThan(0);
  });

  it('returns active with positive days when now is inside the season window', () => {
    const now = new Date(2026, 4, 8);
    const result = computePeriodKpi('season', 'spring', 2026, now);
    expect(result.kind).toBe('active');
    expect(result.days).toBeGreaterThanOrEqual(0);
  });

  it('uses the full year (Jan–Dec) when scope is all', () => {
    const inside = new Date(2026, 6, 1);
    const before = new Date(2025, 11, 31, 23, 59, 59);
    const after = new Date(2027, 0, 1);
    expect(computePeriodKpi('all', null, 2026, inside).kind).toBe('active');
    expect(computePeriodKpi('all', null, 2026, before).kind).toBe('upcoming');
    expect(computePeriodKpi('all', null, 2026, after).kind).toBe('ended');
  });

  it('treats winter as Jan–Mar and fall as Oct–Dec', () => {
    const winterMid = new Date(2026, 1, 15);
    expect(computePeriodKpi('season', 'winter', 2026, winterMid).kind).toBe('active');
    const fallMid = new Date(2026, 10, 15);
    expect(computePeriodKpi('season', 'fall', 2026, fallMid).kind).toBe('active');
  });
});
