import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ErrorBoundary from '../components/ErrorBoundary';
import { applyStoredLanguage } from '../lib/i18n';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    applyStoredLanguage();
  }, []);

  const isProd = process.env.NODE_ENV === 'production';

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
      {/* Analytics + Speed Insights only mount in production. In dev the
          insights scripts 404 on localhost and just clutter the console —
          no useful data anyway. Speed Insights collects real-user Core
          Web Vitals (LCP, INP, CLS) via a tiny beacon on page visits. */}
      {isProd ? <Analytics /> : null}
      {isProd ? <SpeedInsights /> : null}
    </ErrorBoundary>
  );
}

export default MyApp;
