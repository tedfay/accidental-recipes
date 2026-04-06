/**
 * Site-specific configuration — the single surface to change per Biga instance.
 *
 * For a new site: update this file and the :root color tokens in globals.css.
 * Everything else (consent, analytics, security, canonicals) works unchanged.
 */

export const siteConfig = {
  name: 'Accidental Recipes',
  description:
    'Recipes as structured data objects, enriched with Wikidata entities.',
  url:
    process.env['NEXT_PUBLIC_SITE_URL'] || 'https://accidentalrecipes.com',
  locale: 'en',

  font: {
    family: 'Inter',
    weights: [400, 500, 600],
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  },

  analytics: {
    gaMeasurementId:
      process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID'] || null,
    gtmId: process.env['NEXT_PUBLIC_GTM_ID'] || null,
  },

  sentry: {
    dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'] || null,
  },

  consent: {
    storageKey: 'biga_consent',
    version: '1',
  },
} as const;
