import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  environment: process.env.NODE_ENV,
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  replaysOnErrorSampleRate: 1.0,
  
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Sentry] Event captured:', event.message);
      return null;
    }
    return event;
  },
  
  ignoreErrors: [
    'NetworkError',
    'AbortError',
    'ECONNREFUSED',
  ],
  
  denyUrls: [
    /extensions\//i,
    /webkit-muted/i,
  ],
});

export default Sentry;
