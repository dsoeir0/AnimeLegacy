import { useEffect } from 'react';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';
import { applyStoredLanguage } from '../lib/i18n';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    applyStoredLanguage();
  }, []);

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
