import * as Sentry from '@sentry/nextjs';
import { siteConfig } from '@/lib/site-config';

if (siteConfig.sentry.dsn) {
  Sentry.init({
    dsn: siteConfig.sentry.dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],

    // ── Client-side noise floor ─────────────────────────────────
    // Errors matching these patterns are dropped before they leave
    // the browser. Each entry covers a class of unactionable error:
    // transient network conditions, browser internals, deploy-time
    // chunk mismatches, or third-party script failures.
    ignoreErrors: [
      // Font loading: next/font FontFace rejects on network failure;
      // display:'swap' already degrades gracefully (JAVASCRIPT-NEXTJS-3).
      /NetworkError/,

      // ResizeObserver: benign browser layout thrashing, never a bug.
      /ResizeObserver loop/,

      // Code-split chunk 404s during deploys (user has stale tab).
      /Loading chunk [\d]+ failed/,
      /ChunkLoadError/,

      // Navigation cancelled (user clicked away mid-transition).
      /cancelled/i,
    ],

    // Only capture errors from our own scripts. Everything injected
    // by browser extensions, GTM tags, or ad networks is excluded.
    allowUrls: [
      /accidentalrecipes\.com/,
      /netlify\.app/,
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
