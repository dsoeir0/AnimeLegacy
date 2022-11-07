import Head from 'next/head'
import Image from 'next/image'
import css from 'styled-jsx/css'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import Layout from '../components/Layout'

export default function Home({ winterResposta, springResposta, summerResposta, fallResposta }) {

  return (
    <Layout>
      <div>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Winter</h2>
          <div className={styles.buttonContainer}>
            <button className={styles.showButton}>Show all</button>
          </div>
          <div className={styles.carrosel}>
            {winterResposta.data.map(element => (
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
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Spring</h2>
          <div className={styles.buttonContainer}>
            <button className={styles.showButton}>Show all</button>
          </div>
          <div className={styles.carrosel}>
            {springResposta.data.map(element => (
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
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Summer</h2>
          <div className={styles.buttonContainer}>
            <button className={styles.showButton}>Show all</button>
          </div>
          <div className={styles.carrosel}>
            {summerResposta.data.map(element => (
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
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Fall</h2>
          <div className={styles.buttonContainer}>
            <button className={styles.showButton}>Show all</button>
          </div>
          <div className={styles.carrosel}>
            {fallResposta.data.map(element => (
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

export async function getServerSideProps() {

  const baseurl = "https://api.jikan.moe/v4/";

  const winter = await fetch(`${baseurl}seasons/2022/winter`)
  const winterResposta = await winter.json()

  const spring = await fetch(`${baseurl}seasons/2022/spring`)
  const springResposta = await spring.json()

  const summer = await fetch(`${baseurl}seasons/2022/summer`)
  const summerResposta = await summer.json()

  await new Promise((res) => setTimeout(res, 1000));
  const fall = await fetch(`${baseurl}seasons/2022/fall`)
  const fallResposta = await fall.json()


  return { props: { winterResposta, springResposta, summerResposta, fallResposta } }
}

