import { useEffect } from 'react';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';
import { applyStoredLanguage } from '../lib/i18n';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    applyStoredLanguage();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0c10" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AnimeLegacy" />
      </Head>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
