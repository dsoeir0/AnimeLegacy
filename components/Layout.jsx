import React, { useState } from 'react'
import Head from 'next/head'
import Header from './Header'
import Sidebar from './Sidebar'
import styles from '../styles/layout.module.css'

export default function Layout({
    children,
    showSidebar = true,
    headerVariant = 'default',
    layoutVariant = 'default',
}) {
    const [isSidebarVisible, setIsSidebarVisible] = useState(showSidebar);
    const handleOnClick = () => {
        setIsSidebarVisible((oldValue) => !oldValue)
    }

    const layoutClass = layoutVariant === 'dark' ? styles.layoutDark : styles.layoutDefault;

    return (
        <div className={`${styles.layout} ${layoutClass}`}>
            <Head>
                <title>AnimeLegacy</title>
                <link rel="icon" href="/logo_no_text.png" />
            </Head>
            <Header
                handleOnClick={handleOnClick}
                showSidebarToggle={showSidebar}
                variant={headerVariant}
            />
            <div className={styles.contentWrapper}>
                {showSidebar && isSidebarVisible ? <Sidebar /> : null}
                <div className={styles.content}>{children}</div>
            </div>
        </div>
    )
}

