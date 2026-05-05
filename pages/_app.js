import { useEffect } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { applyStoredLanguage } from '../lib/i18n';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    applyStoredLanguage();
  }, []);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
