import React from 'react'
import styles from '../../styles/year.module.css'
import Link from 'next/link'
import Layout from '../../components/Layout'

export default function seasons({ winterResposta, springResposta, summerResposta, fallResposta }) {
  const safeData = (resp) => (Array.isArray(resp?.data) ? resp.data : [])
  const winterData = safeData(winterResposta)
  const springData = safeData(springResposta)
  const summerData = safeData(summerResposta)
  const fallData = safeData(fallResposta)

  return (
    <Layout>
      <div className={styles.sidebarWrapper}>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Winter</h2>
          <div className={styles.carrosel}>
            {winterData.map((element) => (
              <Link key={element.mal_id} href={`/anime/${element.mal_id}`}>
                <div className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <img className={styles.poster}
                      src={element.images.webp.image_url}
                    />
                  </div>
                  <div className={styles.animeTitle}>{element.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.sidebarWrapper}>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Spring</h2>
          <div className={styles.carrosel}>
            {springData.map((element) => (
              <Link key={element.mal_id} href={`/anime/${element.mal_id}`}>
                <div className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <img className={styles.poster}
                      src={element.images.webp.image_url}
                    />
                  </div>
                  <div className={styles.animeTitle}>{element.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.sidebarWrapper}>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Summer</h2>
          <div className={styles.carrosel}>
            {summerData.map((element) => (
              <Link key={element.mal_id} href={`/anime/${element.mal_id}`}>
                <div className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <img className={styles.poster}
                      src={element.images.webp.image_url}
                    />
                  </div>
                  <div className={styles.animeTitle}>{element.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.sidebarWrapper}>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Fall</h2>
          <div className={styles.carrosel}>
            {fallData.map((element) => (
              <Link key={element.mal_id} href={`/anime/${element.mal_id}`}>
                <div className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <img className={styles.poster}
                      src={element.images.webp.image_url}
                    />
                  </div>
                  <div className={styles.animeTitle}>{element.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
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


  return { props: { winterResposta, springResposta, summerResposta, fallResposta } }
}
