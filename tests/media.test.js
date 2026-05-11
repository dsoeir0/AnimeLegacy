import { describe, it, expect } from 'vitest';
import {
  getAnimeBannerUrl,
  getAnimeImageUrl,
  getAnimeThumbUrl,
  getCharacterAvatarUrl,
  getCharacterImageUrl,
} from '../lib/utils/media.js';

const anime = {
  images: {
    webp: { large_image_url: 'jikan-webp-large.webp', image_url: 'jikan-webp.webp' },
    jpg: { large_image_url: 'jikan-jpg-large.jpg', image_url: 'jikan-jpg.jpg' },
  },
};

describe('getAnimeImageUrl', () => {
  it('prefers AniList extraLarge cover over everything else', () => {
    const media = {
      coverImage: { extraLarge: 'anilist-xl.jpg', large: 'anilist-l.jpg' },
      bannerImage: 'anilist-banner.jpg',
    };
    expect(getAnimeImageUrl(anime, media)).toBe('anilist-xl.jpg');
  });

  it('falls through to AniList large when extraLarge is missing', () => {
    expect(getAnimeImageUrl(anime, { coverImage: { large: 'al.jpg' } })).toBe('al.jpg');
  });

  it('falls through to Jikan webp large when AniList absent', () => {
    expect(getAnimeImageUrl(anime, null)).toBe('jikan-webp-large.webp');
  });

  it('returns empty string when no source has a usable URL', () => {
    expect(getAnimeImageUrl({}, null)).toBe('');
  });
});

describe('getAnimeBannerUrl', () => {
  it('prefers AniList bannerImage over poster sources', () => {
    expect(getAnimeBannerUrl(anime, { bannerImage: 'banner.jpg' })).toBe('banner.jpg');
  });

  it('falls back to AniList cover when bannerImage is missing', () => {
    const media = { coverImage: { extraLarge: 'cover.jpg' } };
    expect(getAnimeBannerUrl(anime, media)).toBe('cover.jpg');
  });

  it('falls back to Jikan poster when AniList absent', () => {
    expect(getAnimeBannerUrl(anime, null)).toBe('jikan-webp-large.webp');
  });
});

describe('getAnimeThumbUrl', () => {
  it('returns Jikan webp large first', () => {
    expect(getAnimeThumbUrl(anime)).toBe('jikan-webp-large.webp');
  });

  it('falls through to jpg variants when webp absent', () => {
    expect(
      getAnimeThumbUrl({ images: { jpg: { image_url: 'fallback.jpg' } } }),
    ).toBe('fallback.jpg');
  });

  it('returns empty string when no image is found', () => {
    expect(getAnimeThumbUrl({})).toBe('');
    expect(getAnimeThumbUrl(null)).toBe('');
  });
});

describe('getCharacterAvatarUrl', () => {
  it('returns the nested character.character.images path', () => {
    const entry = {
      character: { images: { webp: { image_url: 'avatar.webp' } } },
    };
    expect(getCharacterAvatarUrl(entry)).toBe('avatar.webp');
  });

  it('falls back to jpg when webp absent', () => {
    const entry = { character: { images: { jpg: { image_url: 'avatar.jpg' } } } };
    expect(getCharacterAvatarUrl(entry)).toBe('avatar.jpg');
  });

  it('returns empty when no character image is present', () => {
    expect(getCharacterAvatarUrl({})).toBe('');
    expect(getCharacterAvatarUrl(null)).toBe('');
  });
});

describe('getCharacterImageUrl', () => {
  it('returns webp image_url first', () => {
    const c = { images: { webp: { image_url: 'char.webp' }, jpg: { image_url: 'char.jpg' } } };
    expect(getCharacterImageUrl(c)).toBe('char.webp');
  });

  it('falls back to jpg when webp absent', () => {
    expect(getCharacterImageUrl({ images: { jpg: { image_url: 'c.jpg' } } })).toBe('c.jpg');
  });

  it('returns empty for missing input', () => {
    expect(getCharacterImageUrl(null)).toBe('');
    expect(getCharacterImageUrl({})).toBe('');
  });
});
