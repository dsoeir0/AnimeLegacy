// Unit tests for the toCardShape adapter — the single funnel that turns a
// Jikan anime payload (optionally enriched with AniList media) into the
// shape the card components consume. Worth guarding because every grid in
// the app relies on it; a silent shape change ripples to every card.

import { describe, expect, it } from 'vitest';
import { toCardShape } from '../lib/utils/cardShape';

const baseJikan = {
  mal_id: 1,
  title: 'Cartographer',
  title_japanese: 'カートグラファー',
  synopsis: 'A short summary.',
  score: 8.42,
  rank: 25,
  year: 2024,
  season: 'spring',
  episodes: 12,
  status: 'Currently Airing',
  type: 'TV',
  studios: [{ name: 'Bones' }],
  genres: [{ name: 'Action' }, { name: 'Drama' }],
  images: { webp: { large_image_url: 'https://cdn.mal/large.webp' } },
};

describe('toCardShape', () => {
  it('returns null when given nothing', () => {
    expect(toCardShape(null)).toBeNull();
    expect(toCardShape(undefined)).toBeNull();
  });

  it('produces both id and mal_id from mal_id (cards rely on either)', () => {
    const card = toCardShape(baseJikan);
    expect(card.id).toBe(1);
    expect(card.mal_id).toBe(1);
  });

  it('falls back to id when mal_id is missing', () => {
    const card = toCardShape({ ...baseJikan, mal_id: undefined, id: 7 });
    expect(card.id).toBe(7);
    expect(card.mal_id).toBe(7);
  });

  it('joins multiple studios with " / "', () => {
    const card = toCardShape({
      ...baseJikan,
      studios: [{ name: 'Bones' }, { name: 'Trigger' }],
    });
    expect(card.studio).toBe('Bones / Trigger');
  });

  it('uses an em-dash when no studio info is available', () => {
    const card = toCardShape({ ...baseJikan, studios: [] });
    expect(card.studio).toBe('—');
  });

  it('prefers a precomputed `studio` string when callers already have one', () => {
    const card = toCardShape({
      ...baseJikan,
      studio: 'MAPPA',
      studios: [{ name: 'Ignored' }],
    });
    expect(card.studio).toBe('MAPPA');
  });

  it('flattens genres (handles strings or {name} objects)', () => {
    const card = toCardShape({
      ...baseJikan,
      genres: [{ name: 'Action' }, 'Drama', null, { name: '' }],
    });
    expect(card.genres).toEqual(['Action', 'Drama']);
  });

  it('reads year from aired.prop.from.year when top-level year is missing', () => {
    const card = toCardShape({
      ...baseJikan,
      year: undefined,
      aired: { prop: { from: { year: 2018 } } },
    });
    expect(card.year).toBe(2018);
  });

  it('coerces score to a number; falls back to 0 for unparseable values', () => {
    expect(toCardShape({ ...baseJikan, score: 9 }).score).toBe(9);
    expect(toCardShape({ ...baseJikan, score: '7.3' }).score).toBe(7.3);
    expect(toCardShape({ ...baseJikan, score: null }).score).toBe(0);
    expect(toCardShape({ ...baseJikan, score: 'n/a' }).score).toBe(0);
  });

  it('preserves rank only when it is a number', () => {
    expect(toCardShape({ ...baseJikan, rank: 12 }).rank).toBe(12);
    expect(toCardShape({ ...baseJikan, rank: null }).rank).toBeNull();
    expect(toCardShape({ ...baseJikan, rank: '12' }).rank).toBeNull();
  });

  it('falls back to the placeholder logo when no image is available', () => {
    const card = toCardShape({ ...baseJikan, images: undefined });
    expect(card.poster).toBe('/logo_no_text.png');
    expect(card.banner).toBe('/logo_no_text.png');
  });

  it('prefers AniList cover/banner over Jikan when provided', () => {
    const aniList = {
      coverImage: { extraLarge: 'https://anilist/extra.png', large: 'https://anilist/large.png' },
      bannerImage: 'https://anilist/banner.png',
    };
    const card = toCardShape(baseJikan, aniList);
    expect(card.poster).toBe('https://anilist/extra.png');
    expect(card.banner).toBe('https://anilist/banner.png');
  });

  it('falls back to the cover image when the AniList banner is missing', () => {
    const aniList = {
      coverImage: { large: 'https://anilist/large.png' },
      bannerImage: null,
    };
    const card = toCardShape(baseJikan, aniList);
    expect(card.banner).toBe('https://anilist/large.png');
  });

  it('uses title_english as a fallback when title is missing', () => {
    const card = toCardShape({ ...baseJikan, title: undefined, title_english: 'Eng' });
    expect(card.title).toBe('Eng');
  });

  it('uses "Untitled" when no title source is available', () => {
    const card = toCardShape({ mal_id: 1 });
    expect(card.title).toBe('Untitled');
  });

  it('reads episodes from any of the supported field names', () => {
    expect(toCardShape({ ...baseJikan, episodes: 24 }).episodes).toBe(24);
    expect(
      toCardShape({ ...baseJikan, episodes: undefined, episodesTotal: 13 }).episodes,
    ).toBe(13);
    expect(
      toCardShape({
        ...baseJikan,
        episodes: undefined,
        episodes_aired: 6,
      }).episodes,
    ).toBe(6);
    expect(
      toCardShape({ ...baseJikan, episodes: undefined }).episodes,
    ).toBeNull();
  });

  it('defaults type to "TV" when none is given', () => {
    const card = toCardShape({ mal_id: 1, title: 'x' });
    expect(card.type).toBe('TV');
  });
});
