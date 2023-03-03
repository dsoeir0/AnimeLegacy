import Head from 'next/head'
import Image from 'next/image'
import css from 'styled-jsx/css'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import Layout from '../components/Layout'

export default function Home({ currentResposta }) {

  return (
    <Layout>
      <div>
        <div className={styles.wrapper}>
          <h2 className={styles.seasonTitle}>Current Season</h2>
          <div className={styles.buttonContainer}>
            <button className={styles.showButton}>Show all</button>
          </div>
          <div className={styles.carrosel}>
            {currentResposta.data.map(element => (
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

  const current = await fetch(`${baseurl}seasons/now`)
  const currentResposta = await current.json()



  return { props: { currentResposta } }
}

