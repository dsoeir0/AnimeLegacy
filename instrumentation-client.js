import { captureRouterTransitionStart, init } from '@sentry/nextjs';

const IGNORED_PATTERNS = [
  /Loading initial props cancelled/i,
  /Failed to load static props/i,
  /next-route-loader/i,
];

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  autoSessionTracking: false,
  beforeSend(event) {
    const message =
      event?.exception?.values?.[0]?.value || event?.message || '';
    if (IGNORED_PATTERNS.some((re) => re.test(message))) return null;
    return event;
  },
  beforeSendTransaction() {
    return null;
  },
});

export const onRouterTransitionStart = captureRouterTransitionStart;
