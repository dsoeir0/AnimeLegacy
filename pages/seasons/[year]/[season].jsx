import React from 'react'
import styles from '../../../styles/year.module.css'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'

export default function seasons({ seasonResposta }) {
  return (
    <div className={styles.container}>
      <title>AnimeLegacy</title>
      <div className={styles.header}>
        <Link href='/'>
          <span className={styles.headerTitle}>AnimeLegacy</span>
        </Link>
      </div>
      <div className={styles.sidebarWrapper}>
        <Sidebar />
        <div className={styles.wrapper}>
            <h2 className={styles.seasonTitle}>Winter</h2>
            <div className={styles.carrosel}>
            {seasonResposta.data.map((element) => (
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
    </div>
  )
}

export async function getServerSideProps(context) {

  const baseurl = "https://api.jikan.moe/v4";

  const { year, season } = context.query
  const seasons = await fetch(`${baseurl}/seasons/${year}/${season}`)
  const seasonResposta = await seasons.json()
  return { props: { seasonResposta } }
}
