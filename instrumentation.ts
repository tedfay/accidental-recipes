import * as Sentry from '@sentry/nextjs';
import { siteConfig } from '@/lib/site-config';

export async function register() {
  if (siteConfig.sentry.dsn) {
    Sentry.init({
      dsn: siteConfig.sentry.dsn,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
