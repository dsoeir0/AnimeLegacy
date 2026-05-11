import { describe, it, expect } from 'vitest';
import { buildHeatmap } from '../lib/utils/heatmap.js';

describe('buildHeatmap', () => {
  it('produces weeks × 7 cells', () => {
    const { cells, weeks, days } = buildHeatmap([], { weeks: 4, now: new Date('2026-05-11T00:00:00Z') });
    expect(weeks).toBe(4);
    expect(days).toBe(7);
    expect(cells).toHaveLength(28);
  });

  it('counts timestamps falling on the same calendar day', () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { cells } = buildHeatmap(
      [new Date('2026-05-11T08:00:00Z'), new Date('2026-05-11T22:00:00Z')],
      { weeks: 1, now },
    );
    const today = cells.find((c) => c.count > 0);
    expect(today.count).toBe(2);
  });

  it('marks days past today as future cells with level 0', () => {
    const now = new Date('2026-05-11T00:00:00Z');
    const { cells } = buildHeatmap([], { weeks: 1, now });
    const futureCells = cells.filter((c) => c.future);
    expect(futureCells.length).toBeGreaterThan(0);
    expect(futureCells.every((c) => c.level === 0)).toBe(true);
  });

  it('assigns level by count thresholds', () => {
    const now = new Date('2026-05-11T00:00:00Z');
    const dayTimestamps = (count) =>
      Array.from({ length: count }, () => new Date('2026-05-11T10:00:00Z'));
    expect(buildHeatmap(dayTimestamps(0), { weeks: 1, now }).cells.find((c) => c.count > 0)).toBeUndefined();
    expect(
      buildHeatmap(dayTimestamps(1), { weeks: 1, now }).cells.find((c) => c.count > 0).level,
    ).toBe(1);
    expect(
      buildHeatmap(dayTimestamps(3), { weeks: 1, now }).cells.find((c) => c.count > 0).level,
    ).toBe(2);
    expect(
      buildHeatmap(dayTimestamps(5), { weeks: 1, now }).cells.find((c) => c.count > 0).level,
    ).toBe(3);
    expect(
      buildHeatmap(dayTimestamps(10), { weeks: 1, now }).cells.find((c) => c.count > 0).level,
    ).toBe(4);
  });

  it('handles Firestore Timestamp objects', () => {
    const now = new Date('2026-05-11T00:00:00Z');
    const ts = { toDate: () => new Date('2026-05-11T10:00:00Z') };
    const { cells } = buildHeatmap([ts], { weeks: 1, now });
    expect(cells.find((c) => c.count > 0).count).toBe(1);
  });

  it('skips falsy / unparseable timestamps without crashing', () => {
    const now = new Date('2026-05-11T00:00:00Z');
    const { cells } = buildHeatmap([null, undefined, 'not-a-date', ''], { weeks: 1, now });
    expect(cells.every((c) => c.count === 0)).toBe(true);
  });
});
