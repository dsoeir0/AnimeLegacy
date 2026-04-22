// Unit tests for the anime list utilities — mostly dedupeByMalId, which
// defends grids from Jikan's habit of returning the same show multiple
// times in one response (schedules with multiple broadcast rows, etc.).

import { describe, expect, it } from 'vitest';
import { dedupeByMalId } from '../lib/utils/anime';

describe('dedupeByMalId', () => {
  it('returns empty array for empty input and defaults', () => {
    expect(dedupeByMalId([])).toEqual([]);
    expect(dedupeByMalId()).toEqual([]);
  });

  it('removes duplicate mal_ids, keeping the first occurrence', () => {
    const items = [
      { mal_id: 1, title: 'A' },
      { mal_id: 2, title: 'B' },
      { mal_id: 1, title: 'A (duplicate)' },
      { mal_id: 1, title: 'A (triplicate)' },
      { mal_id: 3, title: 'C' },
    ];
    const result = dedupeByMalId(items);
    expect(result).toEqual([
      { mal_id: 1, title: 'A' },
      { mal_id: 2, title: 'B' },
      { mal_id: 3, title: 'C' },
    ]);
  });

  it('preserves insertion order', () => {
    const items = [
      { mal_id: 5, title: 'Fifth' },
      { mal_id: 1, title: 'First' },
      { mal_id: 5, title: 'Fifth (dupe)' },
      { mal_id: 3, title: 'Third' },
    ];
    expect(dedupeByMalId(items).map((x) => x.title)).toEqual([
      'Fifth',
      'First',
      'Third',
    ]);
  });

  it('keeps items without a mal_id as-is (can\'t dedupe them)', () => {
    const items = [
      { title: 'No id #1' },
      { mal_id: 10, title: 'Has id' },
      { title: 'No id #2' },
      { mal_id: 10, title: 'Has id (dupe)' },
    ];
    expect(dedupeByMalId(items)).toEqual([
      { title: 'No id #1' },
      { mal_id: 10, title: 'Has id' },
      { title: 'No id #2' },
    ]);
  });

  it('handles the real-world case from Jikan /schedules', () => {
    // Mirrors what /schedules?filter=monday returned when the bug was
    // reported: the same show listed 3 times with identical mal_id.
    const jikanResponse = [
      { mal_id: 42, title: 'Show A' },
      { mal_id: 62983, title: 'Marika-chan' },
      { mal_id: 62983, title: 'Marika-chan' },
      { mal_id: 62983, title: 'Marika-chan' },
      { mal_id: 99, title: 'Show B' },
    ];
    expect(dedupeByMalId(jikanResponse)).toHaveLength(3);
  });
});
