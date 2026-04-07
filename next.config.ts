import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
});

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    /* Source map upload — only runs when SENTRY_AUTH_TOKEN is set (CI). */
    silent: true,
    org: process.env['SENTRY_ORG'],
    project: process.env['SENTRY_PROJECT'],
  }),
);
