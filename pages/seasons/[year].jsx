import React from 'react'
import Image from 'next/image'
import styles from '../../styles/year.module.css'
import Link from 'next/link'
import Layout from '../../components/Layout'
import useMyList from '../../components/useMyList'
import { normalizeAnime } from '../../lib/anime'
import { fetchAniListMediaByMalIds } from '../../lib/anilist'

export default function Seasons({ winterResposta, springResposta, summerResposta, fallResposta, aniListMap }) {
  const safeData = (resp) => (Array.isArray(resp?.data) ? resp.data : [])
  const winterData = safeData(winterResposta)
  const springData = safeData(springResposta)
  const summerData = safeData(summerResposta)
  const fallData = safeData(fallResposta)
  const { addItem, removeItem, isInList } = useMyList()

  return (
    <Layout showSidebar={false} headerVariant="dark" layoutVariant="dark">
      <main className={styles.main}>
        <section className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Seasonal</div>
            <h1 className={styles.title}>Explore the year</h1>
            <p className={styles.subtitle}>Every season, every mood. Dive into the shows that defined each quarter.</p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.seasonTitle}>Winter</h2>
          <div className={styles.grid}>
            {winterData.map((element, index) => {
              const media = aniListMap?.[element.mal_id]
              const imageUrl =
                media?.coverImage?.extraLarge ||
                media?.coverImage?.large ||
                element?.images?.webp?.large_image_url ||
                element?.images?.jpg?.large_image_url ||
                element?.images?.webp?.image_url ||
                element?.images?.jpg?.image_url ||
                ''
                media?.coverImage?.extraLarge && media?.coverImage?.large
                  ? `${media.coverImage.large} 1x, ${media.coverImage.extraLarge} 2x`
                  : undefined
              const normalized = normalizeAnime(element)
              return (
                <div key={element.mal_id} className={styles.card} style={{ animationDelay: `${index * 40}ms` }}>
                  <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                    <a className={styles.cardLink}>
                      <div className={styles.poster}>
                        <Image
                          className={styles.posterImage}
                          src={imageUrl || '/vercel.svg'}
                          alt={element.title}
                          fill
                          sizes="180px"
                        />
                        <span className={styles.score}>{element.score || 'NR'}</span>
                      </div>
                      <div className={styles.cardTitle}>{element.title}</div>
                    </a>
                  </Link>
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => {
                      if (!normalized) return
                      if (isInList(normalized.id)) {
                        removeItem(normalized.id)
                      } else {
                        addItem(normalized)
                      }
                    }}
                  >
                    {normalized && isInList(normalized.id) ? 'In My List' : 'Add to List'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.seasonTitle}>Spring</h2>
          <div className={styles.grid}>
            {springData.map((element, index) => {
              const media = aniListMap?.[element.mal_id]
              const imageUrl =
                media?.coverImage?.extraLarge ||
                media?.coverImage?.large ||
                element?.images?.webp?.large_image_url ||
                element?.images?.jpg?.large_image_url ||
                element?.images?.webp?.image_url ||
                element?.images?.jpg?.image_url ||
                ''
                media?.coverImage?.extraLarge && media?.coverImage?.large
                  ? `${media.coverImage.large} 1x, ${media.coverImage.extraLarge} 2x`
                  : undefined
              const normalized = normalizeAnime(element)
              return (
                <div key={element.mal_id} className={styles.card} style={{ animationDelay: `${index * 40}ms` }}>
                  <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                    <a className={styles.cardLink}>
                      <div className={styles.poster}>
                        <Image
                          className={styles.posterImage}
                          src={imageUrl || '/vercel.svg'}
                          alt={element.title}
                          fill
                          sizes="180px"
                        />
                        <span className={styles.score}>{element.score || 'NR'}</span>
                      </div>
                      <div className={styles.cardTitle}>{element.title}</div>
                    </a>
                  </Link>
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => {
                      if (!normalized) return
                      if (isInList(normalized.id)) {
                        removeItem(normalized.id)
                      } else {
                        addItem(normalized)
                      }
                    }}
                  >
                    {normalized && isInList(normalized.id) ? 'In My List' : 'Add to List'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.seasonTitle}>Summer</h2>
          <div className={styles.grid}>
            {summerData.map((element, index) => {
              const media = aniListMap?.[element.mal_id]
              const imageUrl =
                media?.coverImage?.extraLarge ||
                media?.coverImage?.large ||
                element?.images?.webp?.large_image_url ||
                element?.images?.jpg?.large_image_url ||
                element?.images?.webp?.image_url ||
                element?.images?.jpg?.image_url ||
                ''
                media?.coverImage?.extraLarge && media?.coverImage?.large
                  ? `${media.coverImage.large} 1x, ${media.coverImage.extraLarge} 2x`
                  : undefined
              const normalized = normalizeAnime(element)
              return (
                <div key={element.mal_id} className={styles.card} style={{ animationDelay: `${index * 40}ms` }}>
                  <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                    <a className={styles.cardLink}>
                      <div className={styles.poster}>
                        <Image
                          className={styles.posterImage}
                          src={imageUrl || '/vercel.svg'}
                          alt={element.title}
                          fill
                          sizes="180px"
                        />
                        <span className={styles.score}>{element.score || 'NR'}</span>
                      </div>
                      <div className={styles.cardTitle}>{element.title}</div>
                    </a>
                  </Link>
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => {
                      if (!normalized) return
                      if (isInList(normalized.id)) {
                        removeItem(normalized.id)
                      } else {
                        addItem(normalized)
                      }
                    }}
                  >
                    {normalized && isInList(normalized.id) ? 'In My List' : 'Add to List'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.seasonTitle}>Fall</h2>
          <div className={styles.grid}>
            {fallData.map((element, index) => {
              const media = aniListMap?.[element.mal_id]
              const imageUrl =
                media?.coverImage?.extraLarge ||
                media?.coverImage?.large ||
                element?.images?.webp?.large_image_url ||
                element?.images?.jpg?.large_image_url ||
                element?.images?.webp?.image_url ||
                element?.images?.jpg?.image_url ||
                ''
                media?.coverImage?.extraLarge && media?.coverImage?.large
                  ? `${media.coverImage.large} 1x, ${media.coverImage.extraLarge} 2x`
                  : undefined
              const normalized = normalizeAnime(element)
              return (
                <div key={element.mal_id} className={styles.card} style={{ animationDelay: `${index * 40}ms` }}>
                  <Link href={`/anime/${element.mal_id}`} legacyBehavior>
                    <a className={styles.cardLink}>
                      <div className={styles.poster}>
                        <Image
                          className={styles.posterImage}
                          src={imageUrl || '/vercel.svg'}
                          alt={element.title}
                          fill
                          sizes="180px"
                        />
                        <span className={styles.score}>{element.score || 'NR'}</span>
                      </div>
                      <div className={styles.cardTitle}>{element.title}</div>
                    </a>
                  </Link>
                  <button
                    className={styles.listButton}
                    type="button"
                    onClick={() => {
                      if (!normalized) return
                      if (isInList(normalized.id)) {
                        removeItem(normalized.id)
                      } else {
                        addItem(normalized)
                      }
                    }}
                  >
                    {normalized && isInList(normalized.id) ? 'In My List' : 'Add to List'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </Layout>

  )
}

export async function getServerSideProps(context) {

  const baseurl = "https://api.jikan.moe/v4/";

  const { year } = context.query;

  const winter = await fetch(`${baseurl}seasons/${year}/winter`)
  const winterResposta = await winter.json()

  const spring = await fetch(`${baseurl}seasons/${year}/spring`)
  const springResposta = await spring.json()

  const summer = await fetch(`${baseurl}seasons/${year}/summer`)
  const summerResposta = await summer.json()

  await new Promise((res) => setTimeout(res, 1000));
  const fall = await fetch(`${baseurl}seasons/${year}/fall`)
  const fallResposta = await fall.json()

  const ids = [
    ...(winterResposta?.data || []).map((item) => item.mal_id),
    ...(springResposta?.data || []).map((item) => item.mal_id),
    ...(summerResposta?.data || []).map((item) => item.mal_id),
    ...(fallResposta?.data || []).map((item) => item.mal_id),
  ].filter(Boolean)
  const aniListMap = await fetchAniListMediaByMalIds(ids)

  return { props: { winterResposta, springResposta, summerResposta, fallResposta, aniListMap } }
}
