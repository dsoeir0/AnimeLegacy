import React from 'react'
import styles from '../../styles/year.module.css'
import Link from 'next/link'
import Layout from '../../components/Layout'

export default function seasons({ winterResposta, springResposta, summerResposta, fallResposta }) {
  return (
    <Layout>
      <div className={styles.sidebarWrapper}>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Winter</h2>
          <div className={styles.carrosel}>
            {winterResposta.data.map((element) => (
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
            {springResposta.data.map((element) => (
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
            {summerResposta.data.map((element) => (
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
            {fallResposta.data.map((element) => (
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
