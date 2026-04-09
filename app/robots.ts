import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

/**
 * Dynamic robots.txt — environment-aware via siteConfig.url.
 * Replaces the static public/robots.txt so the sitemap URL
 * is correct across staging, preview, and production deploys.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
