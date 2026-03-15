import styles from '../styles/header.module.css'
import Link from 'next/link'
import Image from 'next/image'

const Header = ({ handleOnClick, showSidebarToggle = true, variant = 'default' }) => {
    const currentYear = new Date().getFullYear()
    const headerClass = variant === 'dark' ? styles.headerDark : styles.headerLight

    return (
        <header className={`${styles.header} ${headerClass}`}>
            <div className={styles.left}>
                {showSidebarToggle ? (
                    <button
                        type="button"
                        className={styles.burger}
                        onClick={() => { handleOnClick() }}
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
                            width={260}
                            height={60}
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
                    <input className={styles.searchInput} placeholder="Search anime, studios, genres..." />
                </div>
            </div>
        </header>
    );
}

export default Header;
