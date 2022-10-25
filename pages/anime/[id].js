import React from 'react'
import styles from '../../styles/anime.module.css'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function anime({ animeResposta }) {
  return (
    <div className={styles.container}>
      <title>{animeResposta.data.title}</title>
      <div className={styles.header}>
        <Link href ='/'>
          <span className={styles.headerTitle}>AnimeLegacy</span>
        </Link>
      </div>
      <div className={styles.Wrapper}> 
        <div className={styles.animeWrapper}>
          <div className={styles.animeTitle}>{animeResposta.data.title}</div>
          <div clasName={styles.centerPoster}>
            <img className={styles.poster}
              src={animeResposta.data.images.webp.image_url}
            />
          </div>
          <div className={styles.borderTop}>
            <span className={styles.animeType}>Type:</span>
            <span  className={styles.animeDescription}>{animeResposta.data.type}</span>
          </div>
          <div className={styles.animePadding}>
            <span className={styles.animeType}>Episodes:</span>
            <span  className={styles.animeDescription}>
              {!animeResposta.data.episodes ? "???":animeResposta.data.episodes} 
            </span>
          </div>
          <div className={styles.animePadding}>
            <span className={styles.animeType}>Status:</span>
            <span  className={styles.animeDescription}>{animeResposta.data.status}</span>
          </div>
          <div className={styles.animePadding}>
            <span className={styles.animeType}>Genres:</span>
            <div className={styles.animeFlex}>
              <span  className={styles.animeDescription}>
                {animeResposta.data.genres.map((element, index) => {
                    if(animeResposta.data.genres.length -1 === index) {
                      return(<span key={index}>{element.name}</span>)
                    } else {
                      return(<span key={index}>{element.name}, </span>)
                    }
                  })
                }
              </span>
            </div>
          </div>
          <div className={styles.animePadding}>
            <span className={styles.animeType}>Score:</span>
            <span  className={styles.animeDescription}>{animeResposta.data.score}</span>
          </div>
        </div>
        <div className={styles.synops}>
          <div className={styles.trailerTitle}>Trailer</div>
          <div className={styles.trailerWrapper}>
            <iframe className={styles.animeTrailer} allow="accelerometer; fullscreen;clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              src={animeResposta.data.trailer.embed_url}>
            </iframe>
            <div className={styles.animeProducers}>Producers:</div>
            <div>
              <span>
                {animeResposta.data.producers.map((element, index) => {
                    if(animeResposta.data.producers.length -1 === index) {
                      return(<span key={index}>{element.name}</span>)
                    } else {
                      return(<span key={index}>{element.name}<p></p> </span>)
                    }
                  })
                }
              </span>
            </div>
          </div>
          <div className={styles.synopsTitle}>Synopsis</div>
          <div className={styles.animeSynopsis}>{animeResposta.data.synopsis}</div>
        </div>
      </div>
    </div>
  )
}
export async function getServerSideProps(context) {
  
  const baseurl = "https://api.jikan.moe/v4";

  const { id } = context.query
  const anime = await fetch(`${baseurl}/anime/${id}`)
  const animeResposta = await anime.json()
  console.log(animeResposta)
  return { props: { animeResposta} }
}