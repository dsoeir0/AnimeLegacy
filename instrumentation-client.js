import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});

// eslint-disable-next-line import/namespace
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
