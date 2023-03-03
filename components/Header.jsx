import styles from '../styles/header.module.css'
import Link from 'next/link';

const Header = ({ handleOnClick }) => {

    return (
        <div>
            <div className={styles.header}>
                <div className={styles.burger} onClick={() => { handleOnClick() }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z" /><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" /></svg>
                </div>
                <Link href='/'>
                    <span className={styles.headerTitle}>AnimeLegacy</span>
                </Link>
            </div>
        </div>
    );
}

export default Header;