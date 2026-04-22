import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
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
      {/* Analytics only mounts in production. In dev the insights script
          404s on localhost and just clutters the console — no useful data. */}
      {process.env.NODE_ENV === 'production' ? <Analytics /> : null}
    </ErrorBoundary>
  );
}

export default MyApp;
