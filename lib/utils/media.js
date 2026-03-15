const pickFirst = (items) => items.find(Boolean) || ''

export const getAnimeImageUrl = (anime, media = null) => pickFirst([
  media?.coverImage?.extraLarge,
  media?.coverImage?.large,
  anime?.images?.webp?.large_image_url,
  anime?.images?.jpg?.large_image_url,
  anime?.images?.webp?.image_url,
  anime?.images?.jpg?.image_url,
  anime?.image,
])

export const getAnimeBannerUrl = (anime, media = null) => pickFirst([
  media?.bannerImage,
  media?.coverImage?.extraLarge,
  media?.coverImage?.large,
  anime?.images?.webp?.large_image_url,
  anime?.images?.jpg?.large_image_url,
  anime?.images?.webp?.image_url,
  anime?.images?.jpg?.image_url,
  anime?.image,
])

export const getCharacterAvatarUrl = (character) => pickFirst([
  character?.character?.images?.webp?.image_url,
  character?.character?.images?.jpg?.image_url,
])
