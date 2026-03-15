import { useEffect, useMemo, useState } from 'react'
import styles from '../../styles/header.module.css'
import Link from 'next/link'
import Image from 'next/image'

const Header = ({ handleOnClick, showSidebarToggle = true, variant = 'default' }) => {
  const currentYear = new Date().getFullYear()
  const headerClass = variant === 'dark' ? styles.headerDark : styles.headerLight
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    let isActive = true
    if (trimmedQuery.length < 2) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(trimmedQuery)}&limit=6&order_by=score&sort=desc`
        )
        const payload = await response.json()
        if (!isActive) return
        setResults(Array.isArray(payload?.data) ? payload.data : [])
        setIsOpen(true)
      } catch (error) {
        if (!isActive) return
        setResults([])
        setIsOpen(true)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }, 350)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [trimmedQuery])

  return (
    <header className={`${styles.header} ${headerClass}`}>
      <div className={styles.left}>
        {showSidebarToggle ? (
          <button
            type="button"
            className={styles.burger}
            onClick={() => {
              handleOnClick()
            }}
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
            </svg>
          </button>
        ) : null}
        <Link href="/" legacyBehavior>
          <a className={styles.logo} aria-label="AnimeLegacy home">
            <Image
              className={styles.logoImage}
              src="/logo_text.png"
              alt="AnimeLegacy"
              width={320}
              height={72}
              priority
            />
          </a>
        </Link>
        <nav className={styles.nav}>
          <Link href="/" legacyBehavior>
            <a className={styles.navLink}>Home</a>
          </Link>
          <Link href={`/seasons/${currentYear}`} legacyBehavior>
            <a className={styles.navLink}>Seasonal</a>
          </Link>
          <Link href="/movies" legacyBehavior>
            <a className={styles.navLink}>Movies</a>
          </Link>
          <Link href="/my-list" legacyBehavior>
            <a className={styles.navLink}>My List</a>
          </Link>
        </nav>
      </div>
      <div className={styles.right}>
        <div className={styles.search}>
          <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search anime, studios, genres..."
            aria-label="Search anime"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (trimmedQuery.length >= 2) setIsOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsOpen(false)
                event.currentTarget.blur()
              }
            }}
          />
          {isOpen ? (
            <div className={styles.searchResults} role="listbox">
              {isLoading ? (
                <div className={styles.searchEmpty}>Searching...</div>
              ) : results.length === 0 ? (
                <div className={styles.searchEmpty}>No matches found.</div>
              ) : (
                results.map((item) => (
                  <Link key={item.mal_id} href={`/anime/${item.mal_id}`} legacyBehavior>
                    <a className={styles.searchItem} onClick={() => setIsOpen(false)}>
                      <div className={styles.searchThumb}>
                        <Image
                          src={item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '/logo_no_text.png'}
                          alt={item.title}
                          width={56}
                          height={72}
                        />
                      </div>
                      <div className={styles.searchMeta}>
                        <div className={styles.searchTitle}>{item.title}</div>
                        <div className={styles.searchSub}>
                          <span>{item.type || 'Anime'}</span>
                          <span>{item.year || item?.aired?.prop?.from?.year || '—'}</span>
                          <span>{item.score ? `${item.score}` : 'NR'}</span>
                        </div>
                      </div>
                    </a>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Header
