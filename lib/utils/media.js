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

// Image URL for decorative thumbs (≤ ~120px render).
// Prefers `large_image_url` (225×320 from MAL) for crisp rendering on
// Retina/HiDPI displays, falling back to `image_url` (192×272). The
// browser handles the downscale either way; the larger source just
// gives us a sharper result at 2x DPR. Pairs with `<Image>` for sharp
// re-encode + WebP + DPR variants on the VPS.
export const getAnimeThumbUrl = (anime) =>
  pickFirst([
    anime?.images?.webp?.large_image_url,
    anime?.images?.jpg?.large_image_url,
    anime?.images?.webp?.image_url,
    anime?.images?.jpg?.image_url,
    anime?.image,
  ]);

export const getCharacterAvatarUrl = (character) =>
  pickFirst([
    character?.character?.images?.webp?.image_url,
    character?.character?.images?.jpg?.image_url,
  ]);

export const getCharacterImageUrl = (character) =>
  pickFirst([character?.images?.webp?.image_url, character?.images?.jpg?.image_url]);
