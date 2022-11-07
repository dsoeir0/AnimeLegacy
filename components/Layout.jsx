import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import styles from '../styles/layout.module.css'

export default function Layout({ children }) {
    const [showSidebar, setShowSidebar] = useState(true);
    const handleOnClick = () => {
        setShowSidebar((oldValue) => !oldValue)
    }

    return (
        <div className={styles.layout}>
            <title>AnimeLegacy</title>
            <Header handleOnClick={handleOnClick} />
            <div className={styles.contentWrapper}>
                {showSidebar ? <Sidebar /> : null}
                <div>{children}</div>
            </div>
        </div>
    )
}



