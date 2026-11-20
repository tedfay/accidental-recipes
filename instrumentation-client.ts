import * as Sentry from '@sentry/nextjs';
import { siteConfig } from '@/lib/site-config';

if (siteConfig.sentry.dsn) {
  Sentry.init({
    dsn: siteConfig.sentry.dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
    beforeSend(event) {
      // next/font creates FontFace objects whose load() promise rejects on
      // transient network failures. display:'swap' already degrades
      // gracefully, and the rejection is unactionable. DOMException code 19
      // is NETWORK_ERR.
      const msg = event.exception?.values?.[0]?.value ?? '';
      if (/NetworkError/.test(msg) && event.breadcrumbs?.some(b => String(b.message).includes('FontFace'))) {
        return null;
      }
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
