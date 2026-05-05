const pickFirst = (items) => items.find(Boolean) || '';

export const getAnimeImageUrl = (anime, media = null) =>
  pickFirst([
    media?.coverImage?.extraLarge,
    media?.coverImage?.large,
    anime?.images?.webp?.large_image_url,
    anime?.images?.jpg?.large_image_url,
    anime?.images?.webp?.image_url,
    anime?.images?.jpg?.image_url,
    anime?.image,
  ]);

export const getAnimeBannerUrl = (anime, media = null) =>
  pickFirst([
    media?.bannerImage,
    media?.coverImage?.extraLarge,
    media?.coverImage?.large,
    anime?.images?.webp?.large_image_url,
    anime?.images?.jpg?.large_image_url,
    anime?.images?.webp?.image_url,
    anime?.images?.jpg?.image_url,
    anime?.image,
  ]);

// Small-preferred image URL for decorative thumbs (≤ ~120px render).
// Flips the priority of `getAnimeImageUrl` to avoid pulling an 800×1200
// poster when we're going to draw it at 44–80px anyway. Pairs with the
// plain-`<img>` rule from CLAUDE.md for the same render-size band.
export const getAnimeThumbUrl = (anime) =>
  pickFirst([
    anime?.images?.webp?.image_url,
    anime?.images?.jpg?.image_url,
    anime?.images?.webp?.large_image_url,
    anime?.images?.jpg?.large_image_url,
    anime?.image,
  ]);

export const getCharacterAvatarUrl = (character) =>
  pickFirst([
    character?.character?.images?.webp?.image_url,
    character?.character?.images?.jpg?.image_url,
  ]);

export const getCharacterImageUrl = (character) =>
  pickFirst([character?.images?.webp?.image_url, character?.images?.jpg?.image_url]);
