import { describe, expect, it } from 'vitest';
import { buildDiscoverPayload } from '../lib/utils/discoverPayload';

const make = (id, overrides = {}) => ({
  mal_id: id,
  title: `Anime ${id}`,
  score: 8,
  popularity: 100,
  rank: id,
  year: 2024,
  type: 'TV',
  episodes: 12,
  genres: [],
  studios: [],
  images: { webp: { image_url: `https://img/${id}` } },
  ...overrides,
});

describe('buildDiscoverPayload', () => {
  it('assigns primary + 2 secondary from the head of the list', () => {
    const list = [make(1), make(2), make(3), make(4)];
    const p = buildDiscoverPayload(list);
    expect(p.primary.mal_id).toBe(1);
    expect(p.secondary.map((a) => a.mal_id)).toEqual([2, 3]);
  });

  it('hidden gems keep only score ≥ 8 and sort by popularity DESC (less popular first)', () => {
    const list = [
      make(1, { score: 9, popularity: 10 }),
      make(2, { score: 7, popularity: 500 }),   // under threshold
      make(3, { score: 8.5, popularity: 400 }), // less popular
      make(4, { score: 8.2, popularity: 50 }),
      make(5, { score: 10, popularity: 800 }),  // least popular
    ];
    const p = buildDiscoverPayload(list);
    expect(p.gems.map((a) => a.mal_id)).toEqual([5, 3, 4, 1]);
  });

  it('caps the gems at 4 entries', () => {
    const list = Array.from({ length: 10 }, (_, i) =>
      make(i + 1, { score: 9, popularity: (i + 1) * 10 }),
    );
    expect(buildDiscoverPayload(list).gems).toHaveLength(4);
  });

  it('vibe pool is the top 20 entries', () => {
    const list = Array.from({ length: 30 }, (_, i) => make(i + 1));
    expect(buildDiscoverPayload(list).vibePool).toHaveLength(20);
  });

  it('mood posters pick entries whose genres match the mood query', () => {
    // Mood "adrenaline" matches genres=1 (Action).
    const list = [
      make(1, { genres: [{ mal_id: 1, name: 'Action' }] }),
      make(2, { genres: [{ mal_id: 36, name: 'Slice of Life' }] }),
      make(3, { genres: [{ mal_id: 1, name: 'Action' }] }),
    ];
    const p = buildDiscoverPayload(list);
    const adrenalineIds = p.moodPosters.adrenaline.map((a) => a.mal_id);
    expect(adrenalineIds).toContain(1);
    expect(adrenalineIds).toContain(3);
    expect(adrenalineIds).not.toContain(2);
  });

  it('returns safe shells for empty/non-array input', () => {
    const p = buildDiscoverPayload(null);
    expect(p.primary).toBeNull();
    expect(p.secondary).toEqual([]);
    expect(p.gems).toEqual([]);
    expect(p.vibePool).toEqual([]);
    // moodPosters still contains an entry per mood (each an empty array).
    expect(Object.keys(p.moodPosters).length).toBeGreaterThan(0);
    for (const stack of Object.values(p.moodPosters)) {
      expect(Array.isArray(stack)).toBe(true);
      expect(stack).toHaveLength(0);
    }
  });
});
