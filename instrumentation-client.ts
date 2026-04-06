import * as Sentry from '@sentry/nextjs';
import { siteConfig } from '@/lib/site-config';

if (siteConfig.sentry.dsn) {
  Sentry.init({
    dsn: siteConfig.sentry.dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
