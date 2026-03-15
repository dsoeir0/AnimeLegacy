const JIKAN_BASE_URL = 'https://api.jikan.moe/v4'

const fetchJikan = async (path) => {
  const response = await fetch(`${JIKAN_BASE_URL}${path}`)
  return response.json()
}

export const getCurrentSeason = () => fetchJikan('/seasons/now')

export const getTopAnimeMovies = () => fetchJikan('/top/anime?type=movie')

export const getSeasonByYear = (year, season) => fetchJikan(`/seasons/${year}/${season}`)

export const getAnimeById = (id) => fetchJikan(`/anime/${id}`)

export const getAnimeCharacters = (id) => fetchJikan(`/anime/${id}/characters`)

export const slimAnimeFields = (item) => ({
  mal_id: item?.mal_id,
  title: item?.title,
  synopsis: item?.synopsis,
  type: item?.type,
  episodes: item?.episodes,
  score: item?.score,
  year: item?.year,
  duration: item?.duration,
  aired: item?.aired,
  images: {
    webp: {
      image_url: item?.images?.webp?.image_url,
      large_image_url: item?.images?.webp?.large_image_url,
    },
    jpg: {
      image_url: item?.images?.jpg?.image_url,
      large_image_url: item?.images?.jpg?.large_image_url,
    },
  },
})

export const slimAnimeResponse = (response) => ({
  data: Array.isArray(response?.data) ? response.data.map(slimAnimeFields) : [],
})
